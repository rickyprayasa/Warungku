import { IService } from '../interfaces/IService';
import { IUserRepository } from '@/infrastructure/database/repositories/interfaces/IUserRepository';
import { User } from '@supabase/supabase-js';

export interface CreateUserInput {
    email: string;
    name: string;
    role?: 'owner' | 'staff' | 'admin';
    storeId?: string; // Optional if they are just created globally, but typically we assign them
}

export class CreateUserService implements IService<CreateUserInput, User> {
    constructor(private readonly userRepository: IUserRepository) { }

    async execute(input: CreateUserInput): Promise<User> {
        if (!input.email || !input.name) {
            throw new Error('Email and Name are required to create a user');
        }

        // Usually, we delegate to IUserRepository.create().
        // Supabase auth handles password management securely (maybe sending an invite link)
        // The `store_members` assignment in V1 was usually done via the UI or Supabase RPC (`create_global_user`).

        // For pure Service Layer implementation bridging the new Repos:
        const newUser = await this.userRepository.create({
            email: input.email,
            user_metadata: { name: input.name }
        } as any) as unknown as User;

        // Optional: if input.storeId && input.role exists, we would inject IStoreRepository or IMemberRepository 
        // to add them to `store_members`. 

        return newUser;
    }
}
