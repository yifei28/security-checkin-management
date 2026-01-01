import { useState, useCallback } from 'react';

/**
 * 分页参数接口 - 用于API请求
 */
export interface PaginationParams {
  page: number;       // 页码（从1开始）
  pageSize: number;   // 每页条数
  sortBy: string;     // 排序字段
  sortOrder: 'asc' | 'desc';  // 排序方向
}

/**
 * API响应中的分页信息
 */
export interface PaginationResponse {
  total: number;      // 总记录数
  page: number;       // 当前页码
  pageSize: number;   // 每页条数
  totalPages: number; // 总页数
}

/**
 * usePagination Hook 返回值
 */
export interface UsePaginationReturn {
  // 状态
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // 计算属性
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;

  // 方法
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  resetPage: () => void;
  setSorting: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  updateFromResponse: (response: PaginationResponse) => void;

  // 用于API请求的参数
  getParams: () => PaginationParams;
  getQueryString: () => string;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

/**
 * 通用分页Hook
 *
 * @param options 初始化选项
 * @returns 分页状态和方法
 *
 * @example
 * const pagination = usePagination({ initialPageSize: 20, initialSortBy: 'name' });
 *
 * // 获取API请求参数
 * const params = pagination.getQueryString();
 * fetch(`/api/guards?${params}`);
 *
 * // 更新分页状态
 * pagination.updateFromResponse(response.pagination);
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 20,
    initialSortBy = 'id',
    initialSortOrder = 'asc'
  } = options;

  // 分页状态
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // 计算属性
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const isFirstPage = page === 1;
  const isLastPage = page >= totalPages;

  // 设置页码（带边界检查）
  const setPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
    setPageState(validPage);
  }, [totalPages]);

  // 设置每页条数（同时重置到第一页）
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  // 下一页
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState(prev => prev + 1);
    }
  }, [hasNextPage]);

  // 上一页
  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPageState(prev => prev - 1);
    }
  }, [hasPrevPage]);

  // 第一页
  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  // 最后一页
  const lastPage = useCallback(() => {
    if (totalPages > 0) {
      setPageState(totalPages);
    }
  }, [totalPages]);

  // 重置到第一页
  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  // 设置排序
  const setSorting = useCallback((newSortBy: string, newSortOrder?: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    if (newSortOrder) {
      setSortOrder(newSortOrder);
    } else {
      // 如果是同一个字段，切换排序方向
      if (newSortBy === sortBy) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortOrder('asc');
      }
    }
    setPageState(1); // 排序改变时重置到第一页
  }, [sortBy]);

  // 从API响应更新分页状态
  const updateFromResponse = useCallback((response: PaginationResponse) => {
    setTotal(response.total);
    setTotalPages(response.totalPages);
    setPageState(response.page);
    setPageSizeState(response.pageSize);
  }, []);

  // 获取API请求参数对象
  const getParams = useCallback((): PaginationParams => ({
    page,
    pageSize,
    sortBy,
    sortOrder
  }), [page, pageSize, sortBy, sortOrder]);

  // 获取查询字符串
  const getQueryString = useCallback((): string => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      sortOrder
    });
    return params.toString();
  }, [page, pageSize, sortBy, sortOrder]);

  return {
    // 状态
    page,
    pageSize,
    total,
    totalPages,
    sortBy,
    sortOrder,

    // 计算属性
    hasNextPage,
    hasPrevPage,
    isFirstPage,
    isLastPage,

    // 方法
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    resetPage,
    setSorting,
    updateFromResponse,
    getParams,
    getQueryString
  };
}

export default usePagination;
