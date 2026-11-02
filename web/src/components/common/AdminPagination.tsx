import { ChevronLeftIcon, ChevronRightIcon } from "../Icon";

export interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

export function buildPageItems(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) pages.add(2).add(3).add(4);
  if (current >= total - 2) pages.add(total - 1).add(total - 2).add(total - 3);

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push("gap");
    items.push(page);
  });
  return items;
}

export default function AdminPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = "mục",
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <nav className="matrix-pagination" aria-label={`Phân trang danh sách ${itemLabel}`}>
      <span className="pagination-summary">
        Hiển thị <strong>{pageStart + 1}–{pageEnd}</strong> trong <strong>{totalItems}</strong> {itemLabel}
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="Trang đầu"
        >
          Đầu
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeftIcon size={15} />
        </button>

        {buildPageItems(safePage, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="pagination-gap">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={item === safePage ? "is-active" : ""}
              onClick={() => onPageChange(item)}
              aria-current={item === safePage ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Trang sau"
        >
          <ChevronRightIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          aria-label="Trang cuối"
        >
          Cuối
        </button>
      </div>

      <label className="pagination-size">
        <span>Số dòng/trang</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}

