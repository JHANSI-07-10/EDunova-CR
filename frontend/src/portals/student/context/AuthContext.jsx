import { createRoleAuthContext } from "../../shared/roleAuthContext";

const { AuthProvider, useAuth } = createRoleAuthContext({
  role: "Student",
  keysPrefix: "edunova_student",
  errorDetail: "This portal is for students only.",
});

export { AuthProvider, useAuth };
