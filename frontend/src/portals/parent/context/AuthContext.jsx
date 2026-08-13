import { useEffect, useState } from "react";
import api from "../lib/api";
import { createRoleAuthContext } from "../../shared/roleAuthContext";

// Parent-portal extra state: the list of the parent's children and the
// currently selected child, persisted in localStorage.
//
// The child id is server-controlled data, so it is sanitized (must be a plain
// non-negative integer string) on every read AND write before touching
// localStorage — a compromised API response can never plant an arbitrary
// value into browser storage.
function toSafeChildId(value) {
  const s = String(value ?? "");
  return /^\d+$/.test(s) ? s : null;
}

function useParentExtra({ user, keys }) {
  const [kids, setKids] = useState([]);
  const [activeChildId, setActiveChildId] = useState(
    () => toSafeChildId(localStorage.getItem(keys.child))
  );

  useEffect(() => {
    if (!user) return;
    api
      .get("/parent/children/")
      .then(({ data }) => {
        setKids(data);
        if (!activeChildId && data.length) {
          const id = toSafeChildId(data[0].id);
          if (id) {
            setActiveChildId(id);
            localStorage.setItem(keys.child, id);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function selectChild(id) {
    const sid = toSafeChildId(id);
    if (!sid) return;
    setActiveChildId(sid);
    localStorage.setItem(keys.child, sid);
  }

  return {
    value: { kids, activeChildId, selectChild },
    onLogout: () => {
      setKids([]);
      setActiveChildId(null);
    },
  };
}

const { AuthProvider, useAuth } = createRoleAuthContext({
  role: "Parent",
  keysPrefix: "edunova_parent",
  errorDetail: "This portal is for parents only.",
  extra: {
    hook: useParentExtra,
    keys: { child: "edunova_parent_active_child" },
  },
});

export { AuthProvider, useAuth };
