"""
Email Validation API — Python SDK

Install: pip install requests
Usage:
    from client import EmailValidationClient
    client = EmailValidationClient("evapi_your_key_here")
    result = client.validate("user@example.com")
    print(result)
"""

from __future__ import annotations

import time
from typing import Any

try:
    import requests
except ImportError as e:
    raise ImportError("Install requests: pip install requests") from e


class EmailValidationError(Exception):
    def __init__(self, message: str, status_code: int, data: dict):
        super().__init__(message)
        self.status_code = status_code
        self.data = data


class EmailValidationClient:
    """Thin Python wrapper around the Email Validation & Deliverability API."""

    DEFAULT_BASE_URL = "https://emailvalidation.fly.dev"

    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL) -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self._session = requests.Session()
        self._session.headers.update(
            {"X-API-Key": api_key, "Content-Type": "application/json"}
        )
        self._base = base_url.rstrip("/")

    def _request(self, method: str, path: str, **kwargs: Any) -> dict:
        res = self._session.request(method, f"{self._base}{path}", **kwargs)
        data = res.json()
        if not res.ok:
            raise EmailValidationError(
                data.get("error", f"HTTP {res.status_code}"),
                res.status_code,
                data,
            )
        return data

    def validate(self, email: str) -> dict:
        """Validate a single email address. Returns a ValidationResult dict."""
        return self._request("POST", "/v1/validate", json={"email": email})

    def bulk_validate(
        self, emails: list[str], webhook_url: str | None = None
    ) -> dict:
        """Submit up to 100 emails for async bulk validation."""
        payload: dict[str, Any] = {"emails": emails}
        if webhook_url:
            payload["webhook_url"] = webhook_url
        return self._request("POST", "/v1/validate/bulk", json=payload)

    def get_job(self, job_id: str) -> dict:
        """Poll the status of a bulk validation job."""
        return self._request("GET", f"/v1/jobs/{job_id}")

    def get_usage(self) -> dict:
        """Return quota usage for the current API key."""
        return self._request("GET", "/v1/usage")

    def bulk_validate_sync(
        self, emails: list[str], timeout: float = 30.0, poll_interval: float = 1.0
    ) -> list[dict]:
        """
        Submit a bulk job and poll until completion.
        Returns a list of ValidationResult dicts.
        Raises TimeoutError if the job doesn't finish within `timeout` seconds.
        """
        job = self.bulk_validate(emails)
        job_id = job["job_id"]
        deadline = time.monotonic() + timeout

        while time.monotonic() < deadline:
            time.sleep(poll_interval)
            status = self.get_job(job_id)
            if status["status"] == "completed":
                return status.get("results", [])
            if status["status"] == "failed":
                raise RuntimeError(f"Bulk job {job_id} failed")

        raise TimeoutError(
            f"Bulk job {job_id} did not complete within {timeout}s"
        )
