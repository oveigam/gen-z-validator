/* tslint:disable */
/* eslint-disable */
/**
 * Gen Z Validation
 * Kneel before zod
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
    PorwerRanger,
    PorwerRangerFromJSON,
    PorwerRangerToJSON,
} from '../models';

export interface GetManyPowerRangerRequest {
    name?: string;
    seasons?: Array<number>;
}

export interface GetOnePowerRangerRequest {
    id: number;
}

/**
 * 
 */
export class PowerRangerApi extends runtime.BaseAPI {

    /**
     */
    async getManyPowerRangerRaw(requestParameters: GetManyPowerRangerRequest, initOverrides?: RequestInit): Promise<runtime.ApiResponse<Array<PorwerRanger>>> {
        const queryParameters: any = {};

        if (requestParameters.name !== undefined) {
            queryParameters['name'] = requestParameters.name;
        }

        if (requestParameters.seasons) {
            queryParameters['seasons'] = requestParameters.seasons;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["username"] = this.configuration.apiKey("username"); // username authentication
        }

        const response = await this.request({
            path: `/power-ranger/`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(PorwerRangerFromJSON));
    }

    /**
     */
    async getManyPowerRanger(requestParameters: GetManyPowerRangerRequest, initOverrides?: RequestInit): Promise<Array<PorwerRanger>> {
        const response = await this.getManyPowerRangerRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     */
    async getOnePowerRangerRaw(requestParameters: GetOnePowerRangerRequest, initOverrides?: RequestInit): Promise<runtime.ApiResponse<PorwerRanger>> {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new runtime.RequiredError('id','Required parameter requestParameters.id was null or undefined when calling getOnePowerRanger.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.apiKey) {
            headerParameters["username"] = this.configuration.apiKey("username"); // username authentication
        }

        const response = await this.request({
            path: `/power-ranger/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => PorwerRangerFromJSON(jsonValue));
    }

    /**
     */
    async getOnePowerRanger(requestParameters: GetOnePowerRangerRequest, initOverrides?: RequestInit): Promise<PorwerRanger> {
        const response = await this.getOnePowerRangerRaw(requestParameters, initOverrides);
        return await response.value();
    }

}