# 这里的 data 对应你 JSON 中的 key
from typing import List
from pydantic import BaseModel


class SelectionRequest(BaseModel):
    data: List[List[str]]  # 接收 [["string"], ["another"]] 格式