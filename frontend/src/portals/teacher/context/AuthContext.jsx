import { createRoleAuthContext } from "../../shared/roleAuthContext";

const { AuthProvider, useAuth } = createRoleAuthContext({
  role: "Teacher",
  keysPrefix: "edunova_teacher",
  errorDetail: "This portal is for teachers only.",
});

export { AuthProvider, useAuth };
