import {StartedTestContainer} from "testcontainers";
import {destroyConnectionPool, executeSql} from "../../src/services/connection-pool";
import {exampleContext, useLocalDb} from "../utils";
import techRecordDocumentJson from "../resources/dynamodb-image-technical-record.json";
import {getContainerizedDatabase} from "./cvsbnop-container";
import {TechRecordUpsertResult} from "../../src/models/upsert-results";
import {processStreamEvent} from "../../src/functions/process-stream-event";
import {DynamoDBStreamEvent} from "aws-lambda";
import {getConnectionPoolOptions} from "../../src/services/connection-pool-options";
import {databaseTearDown} from "./database-teardown";

useLocalDb();

describe("convertTechRecordDocument() integration tests", () => {
    let container: StartedTestContainer;

    beforeAll(async () => {
        jest.setTimeout(60_000);

        // see README for why this environment variable exists
        if (process.env.USE_CONTAINERIZED_DATABASE) {
            container = await getContainerizedDatabase();
        } else {
            (getConnectionPoolOptions as jest.Mock) = jest.fn().mockResolvedValue({
                host: "localhost",
                port: "3306",
                user: "root",
                password: "12345",
                database: "CVSBNOP"
            });
        }
    });

    afterAll(async () => {
        await destroyConnectionPool();
        if (process.env.USE_CONTAINERIZED_DATABASE) {
            await container.stop();
        }
        await databaseTearDown();
    });

    it("should correctly convert a DynamoDB event into Aurora rows", async () => {
        const event: DynamoDBStreamEvent = {
            Records: [
                {
                    eventSourceARN: "arn:aws:dynamodb:eu-west-1:1:table/Technical_Records/stream/2020-01-01T00:00:00.000",
                    eventName: "INSERT",
                    dynamodb: {
                        NewImage: techRecordDocumentJson
                    }
                }
            ]
        };

        // array of arrays: event contains array of records, each with array of tech record entities
        const upsertResults: TechRecordUpsertResult[][] = await processStreamEvent(
            event,
            exampleContext(),
            () => {
                return;
            }
        );

        expect(upsertResults.length).toEqual(1);
        expect(upsertResults[0].length).toEqual(1);

        const upsertResult = upsertResults[0][0];

        const vehicleResultSet = await executeSql(
            `SELECT \`system_number\` FROM \`vehicle\` WHERE \`vehicle\`.\`id\` = ${upsertResult.vehicleId}`
        );
        expect(vehicleResultSet.rows.length).toEqual(1);
        expect(vehicleResultSet.rows[0].system_number).toEqual("SYSTEM-NUMBER");

        const makeModelResultSet = await executeSql(
            `SELECT \`make\` FROM \`make_model\` WHERE \`make_model\`.\`id\` = ${upsertResult.makeModelId}`
        );
        expect(makeModelResultSet.rows.length).toEqual(1);
        expect(makeModelResultSet.rows[0].make).toEqual("MAKE");

        const vehicleClassResultSet = await executeSql(
            `SELECT \`code\` FROM \`vehicle_class\` WHERE \`vehicle_class\`.\`id\` = ${upsertResult.vehicleClassId}`
        );
        expect(vehicleClassResultSet.rows.length).toEqual(1);
        expect(vehicleClassResultSet.rows[0].code).toEqual("2");

        const createdByResultSet = await executeSql(
            `SELECT \`identityId\` FROM \`identity\` WHERE \`identity\`.\`id\` = ${upsertResult.createdById}`
        );
        expect(createdByResultSet.rows.length).toEqual(1);
        expect(createdByResultSet.rows[0].identityId).toEqual("CREATED-BY-ID");

        const lastUpdatedByResultSet = await executeSql(
            `SELECT \`identityId\` FROM \`identity\` WHERE \`identity\`.\`id\` = ${upsertResult.lastUpdatedById}`
        );
        expect(lastUpdatedByResultSet.rows.length).toEqual(1);
        expect(lastUpdatedByResultSet.rows[0].identityId).toEqual("LAST-UPDATED-BY-ID");

        const contactDetailsResultSet = await executeSql(
            `SELECT \`name\` FROM \`contact_details\` WHERE \`contact_details\`.\`id\` = ${upsertResult.contactDetailsId}`
        );
        expect(contactDetailsResultSet.rows.length).toEqual(1);
        expect(contactDetailsResultSet.rows[0].name).toEqual("NAME");

        const techRecordResultSet = await executeSql(
            `SELECT \`createdAt\`, \`offRoad\`, \`numberOfWheelsDriven\`, \`regnDate\` FROM \`technical_record\` WHERE \`technical_record\`.\`id\` = ${upsertResult.techRecordId}`
        );
        expect(techRecordResultSet.rows.length).toEqual(1);
        // check a few fields of different types here
        expect((techRecordResultSet.rows[0].createdAt as Date).toUTCString()).toEqual("Wed, 01 Jan 2020 00:00:00 GMT");
        expect(techRecordResultSet.rows[0].offRoad).toEqual(1);
        expect(techRecordResultSet.rows[0].numberOfWheelsDriven).toEqual(1);
        expect((techRecordResultSet.rows[0].regnDate as Date).toUTCString()).toEqual("Wed, 01 Jan 2020 00:00:00 GMT");

        const brakesResultSet = await executeSql(
            `SELECT \`technical_record_id\`, \`brakeCodeOriginal\` FROM \`psv_brakes\` WHERE \`psv_brakes\`.\`id\` = ${upsertResult.psvBrakesId}`
        );
        expect(brakesResultSet.rows.length).toEqual(1);
        expect(brakesResultSet.rows[0].technical_record_id).toEqual(upsertResult.techRecordId);
        expect(brakesResultSet.rows[0].brakeCodeOriginal).toEqual("333");

        expect(upsertResult.axleSpacingIds.length).toEqual(1);
        const axleSpacingResultSet = await executeSql(
            `SELECT \`technical_record_id\`, \`axles\` FROM \`axle_spacing\` WHERE \`axle_spacing\`.\`id\` = ${upsertResult.axleSpacingIds[0]}`
        );
        expect(axleSpacingResultSet.rows.length).toEqual(1);
        expect(axleSpacingResultSet.rows[0].technical_record_id).toEqual(upsertResult.techRecordId);
        expect(axleSpacingResultSet.rows[0].axles).toEqual("1-2");

        const microfilmResultSet = await executeSql(
            `SELECT \`technical_record_id\`, \`microfilmDocumentType\` FROM \`microfilm\` WHERE \`microfilm\`.\`id\` = ${upsertResult.microfilmId}`
        );
        expect(microfilmResultSet.rows.length).toEqual(1);
        expect(microfilmResultSet.rows[0].technical_record_id).toEqual(upsertResult.techRecordId);
        expect(microfilmResultSet.rows[0].microfilmDocumentType).toEqual("PSV Miscellaneous");

        expect(upsertResult.plateIds.length).toEqual(1);
        const platesResultSet = await executeSql(
            `SELECT \`technical_record_id\`, \`plateSerialNumber\` FROM \`plate\` WHERE \`plate\`.\`id\` = ${upsertResult.plateIds[0]}`
        );
        expect(platesResultSet.rows.length).toEqual(1);
        expect(platesResultSet.rows[0].technical_record_id).toEqual(upsertResult.techRecordId);
        expect(platesResultSet.rows[0].plateSerialNumber).toEqual("1");

        expect(upsertResult.axleIds.length).toEqual(1);
        const axlesResultSet = await executeSql(
            `SELECT \`technical_record_id\`, \`axleNumber\` FROM \`axles\` WHERE \`axles\`.\`id\` = ${upsertResult.axleIds[0]}`
        );
        expect(axlesResultSet.rows.length).toEqual(1);
        expect(axlesResultSet.rows[0].technical_record_id).toEqual(upsertResult.techRecordId);
        expect(axlesResultSet.rows[0].axleNumber).toEqual(1);
    });
});
