class ResizableTable {
  table: HTMLTableElement;
  pageX: number | undefined;
  curCol: HTMLElement | undefined;
  nxtCol: HTMLElement | undefined;
  curColWidth: number | undefined;
  offsetWidth: number | undefined;
  nxtColWidth: number | undefined;
  divs: HTMLDivElement[] = [];

  constructor(table: HTMLTableElement) {
    this.table = table;
    this.pageX = undefined;
    this.curCol = undefined;
    this.nxtCol = undefined;
    this.curColWidth = undefined;
    this.offsetWidth = undefined;
    this.nxtColWidth = undefined;
    this.divs = [];
    this.resizableTable();
  }

  destroy(): void {
    this.removeAllDivs();
  }

  clearState(): void {
    this.pageX = undefined;
    this.curCol = undefined;
    this.nxtCol = undefined;
    this.curColWidth = undefined;
    this.offsetWidth = undefined;
    this.nxtColWidth = undefined;
  }

  onMouseDown(e: MouseEvent): void {
    e.stopPropagation();
    e.preventDefault();
    const target = e.target as HTMLElement;
    this.curCol = target.parentElement as HTMLElement;
    this.nxtCol = this.curCol?.nextElementSibling as HTMLElement;
    this.pageX = e.pageX;

    const padding = this.paddingDiff(this.curCol);

    this.offsetWidth = this.curCol.offsetWidth;
    this.curColWidth = this.offsetWidth - padding;
    if (this.nxtCol) {
      this.nxtColWidth = this.nxtCol.offsetWidth - padding;
    }
    this.table.classList.add("no-pointer-events");
  }

  onMouseOver(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    target.style.borderRight = "2px solid #c0c0c0";
  }

  onMouseOut(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    target.style.borderRight = "";
  }

  onMouseMove(e: MouseEvent): void {
    if (this.curCol) {
      const diffX = e.pageX - (this.pageX || 0);

      if (this.nxtCol) {
        this.nxtCol.style.width = `${(this.nxtColWidth || 0) - diffX}px`;
      }

      this.curCol.style.width = `${(this.curColWidth || 0) + diffX}px`;
    }
  }

  onMouseUp(e: MouseEvent): void {
    this.clearState();
    e.stopPropagation();
    e.preventDefault();
    this.table.classList.remove("no-pointer-events");
  }

  setListeners(div: HTMLDivElement): void {
    div.addEventListener("mousedown", (e) => this.onMouseDown(e));
    div.addEventListener("mouseover", (e) => this.onMouseOver(e));
    div.addEventListener("mouseout", (e) => this.onMouseOut(e));
    document.addEventListener("mousemove", (e: MouseEvent) =>
      this.onMouseMove(e),
    );
    document.addEventListener("mouseup", (e: MouseEvent) => this.onMouseUp(e));
  }

  removeListener(div: HTMLDivElement): void {
    div.removeEventListener("mousedown", (e) => this.onMouseDown(e));
    div.removeEventListener("mouseover", (e) => this.onMouseOver(e));
    div.removeEventListener("mouseout", (e) => this.onMouseOut(e));
    document.removeEventListener("mousemove", (e: MouseEvent) =>
      this.onMouseMove(e),
    );
    document.removeEventListener("mouseup", (e: MouseEvent) =>
      this.onMouseUp(e),
    );
  }

  removeListeners(): void {
    this.divs.forEach((div) => this.removeListener(div));
  }

  createDiv(height: number): HTMLDivElement {
    const div = document.createElement("div");
    div.style.top = "0";
    div.style.right = "0";
    div.style.width = "5px";
    div.style.position = "absolute";
    div.style.cursor = "col-resize";
    div.style.userSelect = "none";
    div.style.height = `${height}px`;
    div.style.zIndex = "100";
    return div;
  }

  removeDiv(div: HTMLDivElement): void {
    div.parentElement?.removeChild(div);
  }

  removeAllDivs(): void {
    this.divs.forEach((div) => {
      this.removeListener(div);
      this.removeDiv(div);
    });
    this.divs.splice(0, this.divs.length);
  }

  paddingDiff(col: HTMLElement): number {
    const style = window.getComputedStyle(col);

    if (style.getPropertyValue("box-sizing") === "border-box") {
      return 0;
    }

    const padLeft = parseInt(style.getPropertyValue("padding-left"), 10) || 0;
    const padRight = parseInt(style.getPropertyValue("padding-right"), 10) || 0;
    return padLeft + padRight;
  }

  resizableTable(): void {
    const rows = this.table.getElementsByTagName("tr");
    const cols = rows[0]?.children;

    if (!cols) return;

    const tableHeight = this.table.offsetHeight;

    for (let row = 0; row < rows.length; ++row) {
      const cols = rows[row]?.children || [];
      for (let col = 0; col < cols.length - 1; ++col) {
        if (row === 0) {
          const div = this.createDiv(tableHeight);
          this.divs.push(div);
          cols[col].appendChild(div);
          this.setListeners(div as HTMLDivElement);
          (cols[col] as HTMLElement).style.position = "relative";
        }
        (cols[col] as HTMLElement).style.whiteSpace = "nowrap";
        (cols[col] as HTMLElement).style.textOverflow = "ellipsis";
      }
    }
  }
}

interface ResizableElement extends HTMLElement {
  __tableResizable?: ResizableTable;
}

function handleUpdate(el: ResizableElement): void {
  const ctx = el.__tableResizable;
  const tables = el.getElementsByTagName("table");
  if (tables.length === 0 && ctx) {
    ctx.destroy();
    delete el.__tableResizable;
  } else if (tables.length > 0 && !ctx) {
    setTimeout(() => {
      el.__tableResizable = new ResizableTable(tables[0] as HTMLTableElement);
    }, 250);
  } else if (tables.length > 0 && ctx) {
    ctx.destroy();
    delete el.__tableResizable;
    setTimeout(() => {
      el.__tableResizable = new ResizableTable(tables[0] as HTMLTableElement);
    }, 250);
  }
}

export const vTableResizable = {
  name: "TableResizable",
  created(el: ResizableElement, binding: { value: boolean }): void {
    if (binding.value) {
      handleUpdate(el);
    }
  },

  updated(el: ResizableElement, binding: { value: boolean }): void {
    if (binding.value) {
      handleUpdate(el);
    }
  },

  beforeUnmount(el: ResizableElement, binding: { value: boolean }): void {
    if (binding.value) {
      const ctx = el.__tableResizable;
      if (ctx) {
        ctx.destroy();
        delete el.__tableResizable;
      }
    }
  },
};
