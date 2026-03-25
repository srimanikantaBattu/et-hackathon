import time
from collections import defaultdict
from typing import Callable, Any


class WorkflowEventBus:
    def __init__(self, max_retries: int = 3, base_backoff_seconds: float = 1.0):
        self._handlers: dict[str, list[Callable[..., Any]]] = defaultdict(list)
        self.max_retries = max_retries
        self.base_backoff_seconds = base_backoff_seconds

    def on(self, event_name: str, handler: Callable[..., Any]) -> None:
        self._handlers[event_name].append(handler)

    def emit(self, event_name: str, **payload) -> None:
        handlers = self._handlers.get(event_name, [])
        for handler in handlers:
            self._call_with_retry(handler, payload)

    def _call_with_retry(self, handler: Callable[..., Any], payload: dict[str, Any]) -> Any:
        for attempt in range(self.max_retries):
            try:
                return handler(**payload)
            except Exception:
                if attempt == self.max_retries - 1:
                    raise
                wait_seconds = self.base_backoff_seconds * (2 ** attempt)
                time.sleep(wait_seconds)
