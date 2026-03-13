// src/core/services/interfaces/IService.ts
export interface IService<TInput, TOutput> {
    execute(input: TInput): Promise<TOutput>;
}
