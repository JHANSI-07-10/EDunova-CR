"""Shared helpers for the portal seed management commands.

Kept here (instead of duplicated in every seed command) so the password
resolution logic exists exactly once. See seed_parent_admin.py and
seed_portal_demo.py.
"""
import os
import secrets


def resolve_seed_password(env_name, label):
    """Password for a seeded account.

    Reads the password from the matching environment variable so deployments
    can set stable credentials per environment. When the variable is unset a
    fresh random password is generated (matching Django's password rules) so
    the command still works out of the box without embedding a shared secret
    in the repository.
    """
    value = (os.environ.get(env_name) or "").strip()
    if value:
        if len(value) < 8:
            raise ValueError(f"{label}: password from {env_name} must be at least 8 characters long.")
        return value
    return secrets.token_urlsafe(12)