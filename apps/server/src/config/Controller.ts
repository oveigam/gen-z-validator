import { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { NextFunction, Request, Response, Router } from "express";
import { AnyZodObject, Schema, z, ZodArrayDef, ZodFirstPartyTypeKind, ZodOptionalDef, ZodTypeAny } from "zod";
import { openapi, openapiAuth } from "./docs";

const IS_DEV = true;

// Abreviatura, es mu largo el nombre y sale mucho
type AZO = AnyZodObject;

function parseStringNumber(param: unknown) {
  return typeof param === "string" ? Number(param) : param;
}

function parseStringBoolean(param: unknown) {
  return param === "true" ? true : param === "false" ? false : param;
}

function preprocess<Def extends { typeName: ZodFirstPartyTypeKind }>(
  key: string,
  params: Record<string, unknown>,
  def: Def
) {
  switch (def.typeName) {
    case ZodFirstPartyTypeKind.ZodOptional:
      // Los esquemas que son opcionales no necesitan nada especial
      // ejecutamos el preproceso de nuevo con el esquema interno
      const optionalDef = def as unknown as ZodOptionalDef;
      preprocess(key, params, optionalDef.innerType._def);
      break;

    case ZodFirstPartyTypeKind.ZodArray:
      const arrDef = def as unknown as ZodArrayDef;
      const param = params[key];
      if (Array.isArray(param)) {
        // Los arrays se mapean segun el tipo del esquema
        if (arrDef.type._def.typeName === ZodFirstPartyTypeKind.ZodNumber) {
          params[key] = param.map(parseStringNumber);
        } else if (arrDef.type._def.typeName === ZodFirstPartyTypeKind.ZodBoolean) {
          params[key] = param.map(parseStringBoolean);
        }
      } else {
        // Si estamos procesando un array que vienen en la query de la consulta hay
        // que tener en cuenta que si solo tiene un elemento no llegará como array
        // si no que llegará como un elemento único
        if (arrDef.type._def.typeName === ZodFirstPartyTypeKind.ZodNumber) {
          params[key] = [parseStringNumber(param)];
        } else if (arrDef.type._def.typeName === ZodFirstPartyTypeKind.ZodBoolean) {
          params[key] = [parseStringBoolean(param)];
        }
      }
      preprocess(key, params, arrDef.type._def);
      break;

    case ZodFirstPartyTypeKind.ZodNumber:
      params[key] = parseStringNumber(params[key]);
      break;

    case ZodFirstPartyTypeKind.ZodBoolean:
      params[key] = parseStringBoolean(params[key]);
      break;

    default:
      break;
  }
}

function parseFromPathOrQuery<P extends AZO>(params: Record<string, unknown>, schema: P) {
  const def = schema._def;

  if (def.typeName === ZodFirstPartyTypeKind.ZodObject) {
    const shape = def.shape() as Record<string, ZodTypeAny>;
    for (const key in shape) {
      preprocess(key, params, shape[key]._def);
    }
  }

  return schema.parse(params);
}

type ValidationSchema<P extends AZO, Q extends AZO, B extends AZO, R extends Schema> = {
  params?: P;
  query?: Q;
  body?: B;
  response: R;
};

/**
 * Middleware que convierte y valida los datos de param, query y body de una request, si los
 * datos no son correctos se lanza un RequestInputError
 *
 * @param validation   Objeto de validacion de zod.
 *                      Para los params y la query es necesario usar z.preprocess para convertir los datos ya que siempre vienen como string o string[]
 * @returns
 */
function inputMiddleware<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
  validation: ValidationSchema<P, Q, B, R>
) {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const { params: paramsSchema, query: querySchema, body: bodySchema } = validation;
      if (paramsSchema) {
        req.params = parseFromPathOrQuery(req.params, paramsSchema);
      }
      if (querySchema) {
        req.query = querySchema.parse(req.query);
      }
      if (bodySchema) {
        req.body = bodySchema.parse(req.body);
      }
      return next();
    } catch (error) {
      // Customize error if desired
      console.log("------------------");
      next(error);
    }
  };
}

type Input<P extends AZO, Q extends AZO, B extends AZO> = {
  params: z.infer<P>;
  query: z.infer<Q>;
  body: z.infer<B>;
};

/**
 *
 * @param controllerFn Funcion que ejecutara el request handler
 * @param statusCode Http status code de respuesta
 * @returns Response a la response con los datos retornados del controllerFn
 */
function createRequestHandler<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
  controllerFn: (input: Input<P, Q, B>) => Promise<z.infer<R>>,
  responseValidator: R,
  statusCode = 200
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = req.params as unknown as z.infer<P>;
      const query = req.query as unknown as z.infer<Q>;
      const body = req.body as unknown as z.infer<B>;

      const response = await controllerFn({ params, query, body });
      if (IS_DEV) {
        // No debería ser necesario validar información que nosotros mismo mandamos,
        // pero podemos hacerlo en dev para detectar posibles errores
        const { success } = responseValidator.safeParse(response);
        if (!success) {
          console.warn("VALIDATION ERROR ON RESPONSE!");
        }
      }
      return res.status(statusCode).json(response);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Traduce la nomenclatura de rutas para metrizadas de express a la nomenclatura de swagger
 *
 * Ej: /user/:userId --> /user/{userId}
 *
 * @param basePath ruta base del endpoint
 * @param path path del enpoint
 * @returns path de un endpoint en swagger
 */
function generateSwaggerPath(basePath: string, path: Path) {
  let swaggerPath = basePath + path;
  if (swaggerPath.includes(":")) {
    const subPaths = swaggerPath.split("/");
    swaggerPath = "";
    for (const subPath of subPaths) {
      if (!subPath) continue;
      if (subPath.includes(":")) {
        swaggerPath = swaggerPath.concat("/{").concat(subPath.replace(":", "")).concat("}");
      } else {
        swaggerPath = swaggerPath.concat("/").concat(subPath);
      }
    }
  }
  return swaggerPath;
}

function generateEndpointDocs(params: {
  path: Path;
  method: "get" | "post" | "put" | "patch" | "delete";
  validation: ValidationSchema<AZO, AZO, AZO, Schema>;
  responseStatus?: number;
  options: ControllerOptions;
}): RouteConfig {
  const {
    path,
    method,
    validation: { response, ...input },
    responseStatus = 200,
    options,
  } = params;

  return {
    method,
    tags: [options.name],
    path: generateSwaggerPath(options.basePath, path),
    security: [{ [openapiAuth.name]: [] }],
    request: {
      ...input,
      body: input.body
        ? {
            content: {
              "application/json": {
                schema: input.body,
              },
            },
          }
        : undefined,
    },
    responses: {
      [responseStatus]: {
        description: "",
        content: {
          "application/json": {
            schema: response,
          },
        },
      },
      // TODO añadir todas las posibles respuestas de errores (No rights, No auth, etc.)
    },
  };
}

type Path = Exclude<`/${string}`, `${string}/`>;

type ControllerOptions = {
  name: string;
  basePath: Path;
};

class Controller {
  router: Router;
  options: ControllerOptions;

  constructor(options: ControllerOptions) {
    this.router = Router();
    this.options = options;
  }

  get<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
    path: Path,
    validation: ValidationSchema<P, Q, B, R>,
    controllerFn: (input: Input<P, Q, B>) => Promise<z.infer<R>>
  ) {
    openapi.registerPath(
      generateEndpointDocs({
        method: "get",
        options: this.options,
        path,
        validation,
      })
    );
    this.router.get(path, inputMiddleware(validation), createRequestHandler(controllerFn, validation.response));
    return controllerFn;
  }

  post<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
    path: Path,
    validation: ValidationSchema<P, Q, B, R>,
    controllerFn: (input: Input<P, Q, B>) => Promise<z.infer<R>>
  ) {
    openapi.registerPath(
      generateEndpointDocs({
        path,
        method: "post",
        validation,
        responseStatus: 201,
        options: this.options,
      })
    );
    this.router.post(path, inputMiddleware(validation), createRequestHandler(controllerFn, validation.response, 201));
    return controllerFn;
  }

  put<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
    path: Path,
    validation: ValidationSchema<P, Q, B, R>,
    controllerFn: (input: Input<P, Q, B>) => Promise<z.infer<R>>
  ) {
    openapi.registerPath(
      generateEndpointDocs({
        path,
        method: "put",
        validation,
        options: this.options,
      })
    );
    this.router.put(path, inputMiddleware(validation), createRequestHandler(controllerFn, validation.response));
    return controllerFn;
  }

  patch<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
    path: Path,
    validation: ValidationSchema<P, Q, B, R>,
    controllerFn: (input: Input<P, Q, B>) => Promise<z.infer<R>>
  ) {
    openapi.registerPath(
      generateEndpointDocs({
        path,
        method: "patch",
        validation,
        options: this.options,
      })
    );
    this.router.patch(path, inputMiddleware(validation), createRequestHandler(controllerFn, validation.response));
    return controllerFn;
  }

  delete<P extends AZO, Q extends AZO, B extends AZO, R extends Schema>(
    path: Path,
    validation: ValidationSchema<P, Q, B, R>,
    controllerFn: (input: Input<P, Q, B>) => Promise<z.infer<R>>
  ) {
    openapi.registerPath(
      generateEndpointDocs({
        path,
        method: "delete",
        validation,
        options: this.options,
      })
    );
    this.router.delete(path, inputMiddleware(validation), createRequestHandler(controllerFn, validation.response));
    return controllerFn;
  }
}

export default Controller;
