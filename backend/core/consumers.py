"""
core/consumers.py — Django Channels WebSocket consumer for real-time chat.

Connect: ws://domain/ws/chat/{room_id}/
Requires JWT token as query param: ?token=<access_token>
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_id   = self.scope['url_route']['kwargs']['room_id']
        self.room_group = f'chat_{self.room_id}'

        # Authenticate via JWT query param
        query_string = self.scope.get('query_string', b'').decode()
        token_str    = self._extract_token(query_string)

        if not token_str:
            await self.close(code=4001)
            return

        self.user = await self._get_user(token_str)
        if not self.user:
            await self.close(code=4001)
            return

        # Verify user is a participant of this room
        in_room = await self._is_participant()
        if not in_room:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        body = data.get('body', '').strip()

        if not body:
            return

        # Save message to DB
        msg = await self._save_message(body)

        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group,
            {
                'type'       : 'chat_message',
                'message_id' : str(msg.id),
                'body'       : msg.body,
                'sender_id'  : str(self.user.id),
                'sender_name': self.user.username,
                'created_at' : msg.created_at.isoformat(),
            }
        )

    async def chat_message(self, event):
        """Receive from group, send to WebSocket client."""
        await self.send(text_data=json.dumps({
            'id'        : event['message_id'],
            'body'      : event['body'],
            'sender'    : {'id': event['sender_id'], 'username': event['sender_name']},
            'created_at': event['created_at'],
            'type'      : 'message',
        }))

    # ── Helpers ──────────────────────────────────────────────

    def _extract_token(self, query_string: str) -> str | None:
        for part in query_string.split('&'):
            if part.startswith('token='):
                return part[6:]
        return None

    @database_sync_to_async
    def _get_user(self, token_str: str):
        try:
            token = AccessToken(token_str)
            return User.objects.get(id=token['user_id'])
        except Exception:
            return None

    @database_sync_to_async
    def _is_participant(self) -> bool:
        from .models import ChatRoom
        try:
            room = ChatRoom.objects.get(id=self.room_id)
            return room.man == self.user or room.woman == self.user
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def _save_message(self, body: str):
        from .models import ChatRoom, Message, MessageType
        room = ChatRoom.objects.get(id=self.room_id)
        msg  = Message.objects.create(
            room         = room,
            sender       = self.user,
            body         = body,
            message_type = MessageType.TEXT,
        )
        ChatRoom.objects.filter(pk=room.pk).update(last_message_at=timezone.now())
        return msg