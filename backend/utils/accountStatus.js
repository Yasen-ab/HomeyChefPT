const ACTIVE_STATUS = 'active';
const INACTIVE_STATUS = 'inactive';

function resolveAccountStatus(status, isActive) {
  if (status === ACTIVE_STATUS || status === INACTIVE_STATUS) {
    return status;
  }

  if (typeof isActive === 'boolean') {
    return isActive ? ACTIVE_STATUS : INACTIVE_STATUS;
  }

  return null;
}

function applyAccountStatus(account, status) {
  account.isActive = status === ACTIVE_STATUS;
}

function isInactiveAccount(account) {
  if (!account) {
    return false;
  }

  const status = resolveAccountStatus(account.status, account.isActive);
  return status === INACTIVE_STATUS;
}

module.exports = {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  resolveAccountStatus,
  applyAccountStatus,
  isInactiveAccount
};
