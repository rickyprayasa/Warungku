import { User } from '@supabase/supabase-js';
import { IRepository } from './IRepository';

export interface IUserRepository extends IRepository<User, Partial<User>, Partial<User>> {
    findByEmail(email: string): Promise<User | null>;
}
