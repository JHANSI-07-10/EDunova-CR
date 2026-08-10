import { createRoleAuthContext } from "../../shared/roleAuthContext";

const { AuthProvider, useAuth } = createRoleAuthContext({
  role: "Admin",
  keysPrefix: "edunova_admin",
  errorDetail: "This account does not have Admin access.",
});

export { AuthProvider, useAuth };
