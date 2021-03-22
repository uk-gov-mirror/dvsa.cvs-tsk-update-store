import {DynamoDbImage} from "../services/dynamodb-images";
import {SqlParametersList} from "aws-sdk/clients/rdsdataservice";
import {TechRecord} from "./tech-record";
import {booleanParam, integerParam, stringParam, timestampParam} from "../services/sql-parameter";

export type Brakes = {
    brakeCodeOriginal: string;
    brakeCode: string;
    dataTrBrakeOne: string;
    dataTrBrakeTwo: string;
    dataTrBrakeThree: string;
    retarderBrakeOne: RetarderBrakeType;
    retarderBrakeTwo: RetarderBrakeType;
    dtpNumber: string;
    brakeForceWheelsNotLocked: BrakeForceWheelsNotLocked;
    brakeForceWheelsUpToHalfLocked: BrakeForceWheelsUpToHalfLocked;
    loadSensingValve: boolean;
    antilockBrakingSystem: boolean;
}

export type RetarderBrakeType = "electric" | "exhaust" | "friction" | "hydraulic" | "other" | "none";

export type BrakeForceWheelsNotLocked = {
    serviceBrakeForceA: number;
    secondaryBrakeForceA: number;
    parkingBrakeForceA: number;
}

export type BrakeForceWheelsUpToHalfLocked = {
    serviceBrakeForceB: number;
    secondaryBrakeForceB: number;
    parkingBrakeForceB: number;
}

export const parseBrakes = (brakes: DynamoDbImage): Brakes => {
    const brakeForceWheelsNotLockedImage: DynamoDbImage = brakes.getMap("brakeForceWheelsNotLocked");
    const brakeForceWheelsNotLocked: BrakeForceWheelsNotLocked = {
        serviceBrakeForceA: brakeForceWheelsNotLockedImage.getNumber("serviceBrakeForceA"),
        secondaryBrakeForceA: brakeForceWheelsNotLockedImage.getNumber("secondaryBrakeForceA"),
        parkingBrakeForceA: brakeForceWheelsNotLockedImage.getNumber("parkingBrakeForceA")
    }

    const brakeForceWheelsUpToHalfLockedImage: DynamoDbImage = brakes.getMap("brakeForceWheelsUpToHalfLocked");
    const brakeForceWheelsUpToHalfLocked: BrakeForceWheelsUpToHalfLocked = {
        serviceBrakeForceB: brakeForceWheelsUpToHalfLockedImage.getNumber("serviceBrakeForceB"),
        secondaryBrakeForceB: brakeForceWheelsUpToHalfLockedImage.getNumber("secondaryBrakeForceB"),
        parkingBrakeForceB: brakeForceWheelsUpToHalfLockedImage.getNumber("parkingBrakeForceB")
    }

    return {
        brakeCodeOriginal: brakes.getString("brakeCodeOriginal"),
        brakeCode: brakes.getString("brakeCode"),
        dataTrBrakeOne: brakes.getString("dataTrBrakeOne"),
        dataTrBrakeTwo: brakes.getString("dataTrBrakeTwo"),
        dataTrBrakeThree: brakes.getString("dataTrBrakeThree"),
        retarderBrakeOne: <RetarderBrakeType>brakes.getString("retarderBrakeOne"),
        retarderBrakeTwo: <RetarderBrakeType>brakes.getString("retarderBrakeTwo"),
        dtpNumber: brakes.getString("dtpNumber"),
        brakeForceWheelsNotLocked,
        brakeForceWheelsUpToHalfLocked,
        loadSensingValve: brakes.getBoolean("loadSensingValve"),
        antilockBrakingSystem: brakes.getBoolean("antilockBrakingSystem")
    }
}

export const toSqlParameters = (brakes: Brakes): SqlParametersList => {
    const sqlParameters: SqlParametersList = [];

    sqlParameters.push(stringParam("brakeCodeOriginal", brakes.brakeCodeOriginal));
    sqlParameters.push(stringParam("brakeCode", brakes.brakeCode));
    sqlParameters.push(stringParam("dataTrBrakeOne", brakes.dataTrBrakeOne));
    sqlParameters.push(stringParam("dataTrBrakeTwo", brakes.dataTrBrakeTwo));
    sqlParameters.push(stringParam("dataTrBrakeThree", brakes.dataTrBrakeThree));
    sqlParameters.push(stringParam("retarderBrakeOne", brakes.retarderBrakeOne));
    sqlParameters.push(stringParam("retarderBrakeTwo", brakes.retarderBrakeTwo));
    sqlParameters.push(stringParam("dtpNumber", brakes.dtpNumber));
    sqlParameters.push(booleanParam("loadSensingValve", brakes.loadSensingValve));
    sqlParameters.push(booleanParam("antilockBrakingSystem", brakes.antilockBrakingSystem));
    sqlParameters.push(integerParam("serviceBrakeForceA", brakes.brakeForceWheelsNotLocked.serviceBrakeForceA));
    sqlParameters.push(integerParam("secondaryBrakeForceA", brakes.brakeForceWheelsNotLocked.secondaryBrakeForceA));
    sqlParameters.push(integerParam("parkingBrakeForceA", brakes.brakeForceWheelsNotLocked.parkingBrakeForceA));
    sqlParameters.push(integerParam("serviceBrakeForceB", brakes.brakeForceWheelsUpToHalfLocked.serviceBrakeForceB));
    sqlParameters.push(integerParam("secondaryBrakeForceB", brakes.brakeForceWheelsUpToHalfLocked.secondaryBrakeForceB));
    sqlParameters.push(integerParam("parkingBrakeForceB", brakes.brakeForceWheelsUpToHalfLocked.parkingBrakeForceB));

    return sqlParameters;
}
