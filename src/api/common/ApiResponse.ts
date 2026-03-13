export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
}

export const createSuccessResponse = <T>(data: T, statusCode: number = 200): ApiResponse<T> => {
    return {
        success: true,
        data,
        statusCode
    };
};

export const createErrorResponse = (error: string | Error, statusCode: number = 400): ApiResponse<never> => {
    const errMessage = error instanceof Error ? error.message : error;
    return {
        success: false,
        error: errMessage,
        statusCode
    };
};
