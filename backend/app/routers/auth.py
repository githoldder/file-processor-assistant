from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Demo in-memory role state.
# Production: replace with JWT / OAuth / Firebase / Keycloak validation.
_demo_role: str = "user"


class RoleBody(BaseModel):
    role: str


@router.get("/me")
async def get_me():
    """Return the current effective role from the server.

    In demo mode the default is 'user'.  Production must derive the role
    from an auth token / session (e.g. Firebase JWT, Keycloak).
    """
    return {"role": _demo_role}


@router.post("/role")
async def set_role(body: RoleBody):
    """Demo-only: switch role on the server side.

    Production must NOT allow the client to choose its own role – the role
    should come exclusively from the auth provider.
    """
    if body.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
    global _demo_role
    _demo_role = body.role
    return {"role": _demo_role}


def get_current_role() -> str:
    return _demo_role

