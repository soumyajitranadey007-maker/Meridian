from app.services.websocket_manager import WebSocketManager


class Socket:
    def __init__(self): self.messages = []
    async def send_json(self, event): self.messages.append(event)


async def test_websocket_manager_broadcasts():
    manager = WebSocketManager(); socket = Socket(); manager.connections.add(socket)  # type: ignore[arg-type]
    await manager.broadcast({"kind": "MilestoneFunded"})
    assert socket.messages[0]["kind"] == "MilestoneFunded"
