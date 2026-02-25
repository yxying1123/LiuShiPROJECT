from typing import Any, Dict

from pydantic import BaseModel, Field


class ResponseModel(BaseModel):
    code: int = 0
    msg: str = ""
    data: Dict[str, Any] = Field(default_factory=dict)  # 设置默认值为空字典
