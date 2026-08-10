import { createPortalClient } from "../../../api/portalClient";

const api = createPortalClient({
  accessKey: "edunova_student_access",
  refreshKey: "edunova_student_refresh",
  loginPath: "/student/login",
});

export default api;
