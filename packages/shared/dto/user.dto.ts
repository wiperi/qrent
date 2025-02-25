import { user } from "@prisma/client";

export type UserDTO = Omit<user, 'id'>;