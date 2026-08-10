import { createPortalClient } from "../../../api/portalClient";

const api = createPortalClient({
  accessKey: "edunova_teacher_access",
  refreshKey: "edunova_teacher_refresh",
  loginPath: "/teacher/login",
});

export default api;
