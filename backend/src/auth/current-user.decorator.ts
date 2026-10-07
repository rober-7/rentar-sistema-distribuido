import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.getType<string>() === 'http'
      ? context.switchToHttp().getRequest().user
      : GqlExecutionContext.create(context).getContext().req.user,
);
