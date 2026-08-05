import { NotificationDto } from '@booking-ticket-system/DTOs';
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      client.join(`user_${userId}`);
      console.log(`🔌 Client connected and joined room: user_${userId}`);
    } else {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  sendNotificationToUser(notificationData: NotificationDto) {
    if (!this.server) {
      Logger.error('❌ WebSocket Server is not initialized yet!');
      return;
    }

    this.server
      .to(`user_${notificationData.UserId}`)
      .emit('new_notification', notificationData);
  }
}
