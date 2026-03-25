import json
from datetime import timedelta
from typing import Any, Optional
import redis
from app.config import settings


class RedisWorkflowState:
    def __init__(self):
        self.client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

    def _workflow_key(self, workflow_run_id: int) -> str:
        return f"workflow:{workflow_run_id}"

    def _handoff_key(self, workflow_run_id: int, company_id: str, stage: str) -> str:
        return f"workflow:{workflow_run_id}:handoff:{company_id}:{stage}"

    def set_workflow_meta(self, workflow_run_id: int, values: dict[str, Any]) -> None:
        key = self._workflow_key(workflow_run_id)
        self.client.hset(key, mapping={k: json.dumps(v) for k, v in values.items()})
        self.client.expire(key, int(timedelta(days=7).total_seconds()))

    def get_workflow_meta(self, workflow_run_id: int) -> dict[str, Any]:
        key = self._workflow_key(workflow_run_id)
        data = self.client.hgetall(key)
        return {k: self._safe_json(v) for k, v in data.items()}

    def set_handoff(self, workflow_run_id: int, company_id: str, stage: str, payload: Any) -> None:
        key = self._handoff_key(workflow_run_id, company_id, stage)
        self.client.set(key, json.dumps(payload))
        self.client.expire(key, int(timedelta(days=7).total_seconds()))

    def get_handoff(self, workflow_run_id: int, company_id: str, stage: str) -> Optional[Any]:
        key = self._handoff_key(workflow_run_id, company_id, stage)
        data = self.client.get(key)
        if not data:
            return None
        return self._safe_json(data)

    @staticmethod
    def _safe_json(raw: str) -> Any:
        try:
            return json.loads(raw)
        except Exception:
            return raw
