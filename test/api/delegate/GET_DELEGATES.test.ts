import { Fixture } from 'test/api/base/fixture';
import { API_ACTION_TYPES } from 'shared/driver/socket/codes';
import { socketRequest } from 'test/api/base';
import { expect } from 'chai';
import { ResponseDelegates } from 'shared/model/types';

describe('Test GET_DELEGATES', () => {

    const TOTAL_DELEGATES_COUNT = 4;

    it('Positive', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                limit: 3,
                offset: 0,
            },
        };

        const SUCCESS = [{
            username: 'delegate3',
            missedBlocks: 0,
            forgedBlocks: 0,
            publicKey: '137b9f0f839ab3ecd2146bfecd64d31e127d79431211e352bedfeba5fd61a57a',
            votes: 0,
            confirmedVoteCount: 0,
            approval: 0,
        }, {
            username: 'delegate4',
            missedBlocks: 0,
            forgedBlocks: 0,
            publicKey: '80ede51ab3ca44ff66c9d5e0edebf2b0c94c8d09c5963bc8e80c7cdbb37a4914',
            votes: 0,
            confirmedVoteCount: 0,
            approval: 0,
        }, {
            username: 'delegate1',
            missedBlocks: 0,
            forgedBlocks: 0,
            publicKey: '83cb3d8641c8e73735cc1b70c915602ffcb6e5a68f14a71056511699050a1a05',
            votes: 2,
            confirmedVoteCount: 2,
            approval: 0,
        }];

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.deep.equal(SUCCESS);
        expect(response.body.data.count).to.equal(TOTAL_DELEGATES_COUNT);
    });

    it('Get One', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                limit: 1,
                offset: 0,
            }
        };

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates.length).to.equal(1);
    });

    it('Empty', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                limit: 10,
                offset: 5,
            }
        };

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.have.lengthOf(0);
        expect(response.body.data.count).to.equal(TOTAL_DELEGATES_COUNT);
        expect(response.body.errors).to.equal(undefined);
    });

    it('Negative', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                offset: 0,
            },
        };

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(false);
        expect(response.body.errors).to.deep.equal(
            ['IS NOT VALID REQUEST:\'GET_DELEGATES\'... Missing required property: limit']
        );
    });

    it('By username', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                username: 'ATe3',
                limit: 3,
                offset: 0,
            },
        };

        const SUCCESS = {
            delegates: [{
                username: 'delegate3',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: '137b9f0f839ab3ecd2146bfecd64d31e127d79431211e352bedfeba5fd61a57a',
                votes: 0,
                confirmedVoteCount: 0,
                approval: 0,
            }],
            count: 1,
        };

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.deep.equal(SUCCESS.delegates);
        expect(response.body.data.count).to.equal(SUCCESS.count);
    });

    it('By empty username', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                username: '',
                limit: 3,
                offset: 0,
            },
        };

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(false);
        expect(response.body.errors).to.deep.equal(
            ['IS NOT VALID REQUEST:\'GET_DELEGATES\'... String is too short (0 chars), minimum 3']
        );
    });

    it('Username is undefined', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                username: undefined,
                limit: 3,
                offset: 0,
            },
        };

        const SUCCESS = {
            delegates: [
                {
                    username: 'delegate3',
                    missedBlocks: 0,
                    forgedBlocks: 0,
                    publicKey: '137b9f0f839ab3ecd2146bfecd64d31e127d79431211e352bedfeba5fd61a57a',
                    votes: 0,
                    confirmedVoteCount: 0,
                    approval: 0
                },
                {
                    username: 'delegate4',
                    missedBlocks: 0,
                    forgedBlocks: 0,
                    publicKey: '80ede51ab3ca44ff66c9d5e0edebf2b0c94c8d09c5963bc8e80c7cdbb37a4914',
                    votes: 0,
                    confirmedVoteCount: 0,
                    approval: 0
                },
                {
                    username: 'delegate1',
                    missedBlocks: 0,
                    forgedBlocks: 0,
                    publicKey: '83cb3d8641c8e73735cc1b70c915602ffcb6e5a68f14a71056511699050a1a05',
                    votes: 2,
                    confirmedVoteCount: 2,
                    approval: 0
                }
            ],
            count: 4
        };

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.deep.equal(SUCCESS.delegates);
        expect(response.body.data.count).to.equal(SUCCESS.count);
    });

    it('DESC sorting by public key', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                limit: 3,
                offset: 0,
                sort: [['publicKey', 'DESC']],
            },
        };

        const SUCCESS = [{
            username: 'delegate2',
            missedBlocks: 0,
            forgedBlocks: 0,
            publicKey: 'f959e6c8d279c97d3ec5ba993f04ab740a6e50bec4aad75a8a1e7808a6c5eec7',
            votes: 0,
            confirmedVoteCount: 0,
            approval: 0
        },
        {
            username: 'delegate1',
            missedBlocks: 0,
            forgedBlocks: 0,
            publicKey: '83cb3d8641c8e73735cc1b70c915602ffcb6e5a68f14a71056511699050a1a05',
            votes: 2,
            confirmedVoteCount: 2,
            approval: 0
        },
        {
            username: 'delegate4',
            missedBlocks: 0,
            forgedBlocks: 0,
            publicKey: '80ede51ab3ca44ff66c9d5e0edebf2b0c94c8d09c5963bc8e80c7cdbb37a4914',
            votes: 0,
            confirmedVoteCount: 0,
            approval: 0
        }];

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.deep.equal(SUCCESS);
        expect(response.body.data.count).to.equal(TOTAL_DELEGATES_COUNT);
    });

    it('DESC sorting by votes', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                limit: 3,
                offset: 0,
                sort: [['votes', 'DESC']],
            },
        };

        const SUCCESS = [
            {
                username: 'delegate1',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: '83cb3d8641c8e73735cc1b70c915602ffcb6e5a68f14a71056511699050a1a05',
                votes: 2,
                confirmedVoteCount: 2,
                approval: 0
            },
            {
                username: 'delegate2',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: 'f959e6c8d279c97d3ec5ba993f04ab740a6e50bec4aad75a8a1e7808a6c5eec7',
                votes: 0,
                confirmedVoteCount: 0,
                approval: 0
            },
            {
                username: 'delegate3',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: '137b9f0f839ab3ecd2146bfecd64d31e127d79431211e352bedfeba5fd61a57a',
                votes: 0,
                confirmedVoteCount: 0,
                approval: 0
            },
        ];

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.deep.equal(SUCCESS);
        expect(response.body.data.count).to.equal(TOTAL_DELEGATES_COUNT);
    });

    it('DESC sorting by username', async () => {
        const REQUEST = {
            headers: Fixture.getBaseHeaders(),
            code: API_ACTION_TYPES.GET_DELEGATES,
            body: {
                limit: 3,
                offset: 0,
                sort: [['username', 'DESC']],
            },
        };

        const SUCCESS = [
            {
                username: 'delegate4',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: '80ede51ab3ca44ff66c9d5e0edebf2b0c94c8d09c5963bc8e80c7cdbb37a4914',
                votes: 0,
                confirmedVoteCount: 0,
                approval: 0
            },
            {
                username: 'delegate3',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: '137b9f0f839ab3ecd2146bfecd64d31e127d79431211e352bedfeba5fd61a57a',
                votes: 0,
                confirmedVoteCount: 0,
                approval: 0
            },
            {
                username: 'delegate2',
                missedBlocks: 0,
                forgedBlocks: 0,
                publicKey: 'f959e6c8d279c97d3ec5ba993f04ab740a6e50bec4aad75a8a1e7808a6c5eec7',
                votes: 0,
                confirmedVoteCount: 0,
                approval: 0
            },
        ];

        const response = await socketRequest<any, ResponseDelegates>(REQUEST);

        expect(response.body.success).to.equal(true);
        expect(response.body.data.delegates).to.deep.equal(SUCCESS);
        expect(response.body.data.count).to.equal(TOTAL_DELEGATES_COUNT);
    });
});
