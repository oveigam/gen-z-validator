/* tslint:disable */
/* eslint-disable */
/**
 * Gen Z Validation
 * Mejor tipado, menos boilerplate.
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import {
    InlineResponse200,
    InlineResponse200FromJSON,
    InlineResponse200ToJSON,
} from '../models';

export interface PowerRangersGetRequest {
    name?: string;
}

export interface PowerRangersIdGetRequest {
    id: number;
}

/**
 * 
 */
export class PowerRangersApi extends runtime.BaseAPI {

    /**
     */
    async powerRangersGetRaw(requestParameters: PowerRangersGetRequest, initOverrides?: RequestInit): Promise<runtime.ApiResponse<Array<InlineResponse200>>> {
        const queryParameters: any = {};

        if (requestParameters.name !== undefined) {
            queryParameters['name'] = requestParameters.name;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("bearerAuth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/power-rangers/`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(InlineResponse200FromJSON));
    }

    /**
     */
    async powerRangersGet(requestParameters: PowerRangersGetRequest, initOverrides?: RequestInit): Promise<Array<InlineResponse200>> {
        const response = await this.powerRangersGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async powerRangersIdGetRaw(requestParameters: PowerRangersIdGetRequest, initOverrides?: RequestInit): Promise<runtime.ApiResponse<InlineResponse200>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling powerRangersIdGet.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("bearerAuth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/power-rangers/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => InlineResponse200FromJSON(jsonValue));
    }

    /**
     */
    async powerRangersIdGet(requestParameters: PowerRangersIdGetRequest, initOverrides?: RequestInit): Promise<InlineResponse200> {
        const response = await this.powerRangersIdGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

}