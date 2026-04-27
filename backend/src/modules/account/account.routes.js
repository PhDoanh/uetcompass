const express = require('express');
const { accountController } = require('./account.controller');
const { requireAccountAccess } = require('./account.guard');

const accountRouter = express.Router();

accountRouter.use(requireAccountAccess);
accountRouter.get('/profile', accountController.getProfile);
accountRouter.patch('/profile', accountController.patchProfile);
accountRouter.post('/password/change', accountController.changePassword);
accountRouter.delete('/hard-delete', accountController.hardDeleteAccount);

module.exports = {
  accountRouter,
};
