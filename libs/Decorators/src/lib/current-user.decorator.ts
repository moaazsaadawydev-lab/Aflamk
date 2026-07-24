import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    if (ctx.getType() === 'http') {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user;
      return data ? user?.[data] : user;
    }

    if (ctx.getType() === 'rpc') {
      const metadata = ctx.switchToRpc().getContext();
      const userId = metadata.get('x-user-id')?.[0];
      const role = metadata.get('x-user-role')?.[0];
      const user: any = { id: userId, role };
      return data ? user?.[data] : user;
    }
  },
);
