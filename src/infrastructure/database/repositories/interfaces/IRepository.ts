export interface QueryFilter {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in';
    value: any;
}

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface SortOptions {
    field: string;
    order: 'asc' | 'desc';
}

export interface IRepository<T, InsertDTO, UpdateDTO> {
    findById(id: string): Promise<T | null>;
    findAll(filters?: QueryFilter[], sort?: SortOptions, pagination?: PaginationOptions): Promise<T[]>;
    create(data: InsertDTO): Promise<T>;
    update(id: string, data: UpdateDTO): Promise<T>;
    delete(id: string): Promise<boolean>;
}
