"""Short-lived, Freighter-signed authentication for Meridian administrators."""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import secrets

from fastapi import Header, HTTPException, status
from stellar_sdk import Keypair
from stellar_sdk.exceptions import BadSignatureError

from ..config import get_settings

MESSAGE_PREFIX = b"Stellar Signed Message:\n"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def issue_challenge_message(wallet_address: str, nonce: str, expires_at: datetime) -> str:
    return "\n".join(
        [
            "Meridian Admin Authorization",
            "Network: Stellar Testnet",
            f"Wallet: {wallet_address}",
            f"Nonce: {nonce}",
            f"Expires: {as_utc(expires_at).isoformat()}",
            "Purpose: view Meridian private operations metrics",
        ]
    )


def new_nonce() -> str:
    return secrets.token_urlsafe(32)


def verify_freighter_signature(wallet_address: str, message: str, signature_base64: str) -> None:
    try:
        signature = base64.b64decode(signature_base64, validate=True)
        message_hash = hashlib.sha256(MESSAGE_PREFIX + message.encode("utf-8")).digest()
        Keypair.from_public_key(wallet_address).verify(message_hash, signature)
    except (BadSignatureError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="The Freighter signature could not be verified.") from exc


def _configured_secret() -> bytes:
    secret = get_settings().admin_auth_secret
    if not secret or len(secret) < 32:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin authentication is not configured. Set ADMIN_AUTH_SECRET in Vercel.")
    return secret.encode("utf-8")


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _from_base64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_admin_token(wallet_address: str) -> tuple[str, datetime]:
    settings = get_settings()
    expires_at = utc_now() + timedelta(seconds=settings.admin_session_ttl_seconds)
    payload = {"sub": wallet_address, "exp": int(expires_at.timestamp())}
    encoded_payload = _base64url(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signature = _base64url(hmac.new(_configured_secret(), encoded_payload.encode("ascii"), hashlib.sha256).digest())
    return f"{encoded_payload}.{signature}", expires_at


def _decode_admin_token(token: str) -> str:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        expected_signature = _base64url(hmac.new(_configured_secret(), encoded_payload.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(encoded_signature, expected_signature):
            raise ValueError("invalid signature")
        payload = json.loads(_from_base64url(encoded_payload))
        wallet_address = payload["sub"]
        if not isinstance(wallet_address, str) or int(payload["exp"]) <= int(utc_now().timestamp()):
            raise ValueError("expired or malformed payload")
        return wallet_address
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your admin session has expired. Sign again with Freighter.") from exc


async def require_admin(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="A signed administrator session is required.")
    wallet_address = _decode_admin_token(authorization.removeprefix("Bearer "))
    if wallet_address not in get_settings().admin_wallets:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This Freighter wallet is not authorized to view Meridian operations.")
    return wallet_address
