import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  /** 当前页码（从1开始） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 页码改变回调 */
  onPageChange: (page: number) => void;
  /** 每页条数改变回调 */
  onPageSizeChange?: (pageSize: number) => void;
  /** 可选的每页条数选项 */
  pageSizeOptions?: number[];
  /** 是否显示每页条数选择器 */
  showPageSizeSelector?: boolean;
  /** 是否显示总数信息 */
  showTotal?: boolean;
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 通用表格分页组件
 *
 * @example
 * <TablePagination
 *   page={pagination.page}
 *   pageSize={pagination.pageSize}
 *   total={pagination.total}
 *   totalPages={pagination.totalPages}
 *   onPageChange={pagination.setPage}
 *   onPageSizeChange={pagination.setPageSize}
 * />
 */
export function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showTotal = true,
  className = ""
}: TablePaginationProps) {
  // 不显示分页如果只有一页或没有数据
  if (totalPages <= 1 && total <= pageSize) {
    return null;
  }

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // 总页数较少，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数较多，显示省略号
      pages.push(1);

      if (page <= 3) {
        // 当前页靠近开头
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // 当前页靠近结尾
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 ${className}`}>
      {/* 左侧：总数信息和每页条数选择 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showTotal && (
          <span>
            共 <span className="font-medium text-foreground">{total}</span> 条记录，
            第 <span className="font-medium text-foreground">{page}</span>/{totalPages} 页
          </span>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>每页</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>条</span>
          </div>
        )}
      </div>

      {/* 右侧：分页按钮 */}
      <Pagination>
        <PaginationContent>
          {/* 上一页 */}
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="gap-1"
            >
              上一页
            </Button>
          </PaginationItem>

          {/* 页码 */}
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={pageNum}>
                <Button
                  variant={page === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-9 h-9 p-0"
                >
                  {pageNum}
                </Button>
              </PaginationItem>
            );
          })}

          {/* 下一页 */}
          <PaginationItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="gap-1"
            >
              下一页
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export default TablePagination;
