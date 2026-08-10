import { createPortalClient } from "../../../api/portalClient";

const api = createPortalClient({
  accessKey: "edunova_admin_access",
  refreshKey: "edunova_admin_refresh",
  loginPath: "/admin/login",
});

export default api;
