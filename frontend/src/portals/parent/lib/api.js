import { createPortalClient } from "../../../api/portalClient";

const api = createPortalClient({
  accessKey: "edunova_parent_access",
  refreshKey: "edunova_parent_refresh",
  loginPath: "/parent/login",
});

export default api;
