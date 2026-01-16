import express from 'express';

import authUser from '../middleware/authUser.js';
import isSudo from '../middleware/isSudo.js';
import userExists from '../middleware/userExists.js';
import {
    listDelegationsController,
    createDelegationController,
    getUserDelegationsController,
    updateUserDelegationsController,
    updateDelegationController,
    deleteDelegationController,
} from '../controllers/delegations/index.js';

const router = express.Router();

router.get('/delegations', authUser, listDelegationsController);
router.post('/delegations', authUser, isSudo, createDelegationController);
router.put(
    '/delegations/:delegationId',
    authUser,
    isSudo,
    updateDelegationController
);
router.delete(
    '/delegations/:delegationId',
    authUser,
    isSudo,
    deleteDelegationController
);

router.get(
    '/users/:userId/delegations',
    authUser,
    isSudo,
    userExists,
    getUserDelegationsController
);

router.put(
    '/users/:userId/delegations',
    authUser,
    isSudo,
    userExists,
    updateUserDelegationsController
);

export default router;
