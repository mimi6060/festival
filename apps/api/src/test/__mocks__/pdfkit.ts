/**
 * Mock implementation of the pdfkit module for testing
 *
 * This mock provides stub implementations of PDFKit classes
 * that can be used in unit tests without requiring actual PDF generation.
 */

class PDFDocumentMock {
  page = { width: 595, height: 842 };
  y = 0;

  private callbacks: Record<string, Function> = {};

  on(event: string, callback: Function): this {
    this.callbacks[event] = callback;
    return this;
  }

  rect(): this {
    return this;
  }

  fill(): this {
    return this;
  }

  fillAndStroke(): this {
    return this;
  }

  stroke(): this {
    return this;
  }

  lineWidth(): this {
    return this;
  }

  circle(): this {
    return this;
  }

  roundedRect(): this {
    return this;
  }

  clip(): this {
    return this;
  }

  save(): this {
    return this;
  }

  restore(): this {
    return this;
  }

  fontSize(): this {
    return this;
  }

  font(): this {
    return this;
  }

  fillColor(): this {
    return this;
  }

  text(): this {
    return this;
  }

  image(): this {
    return this;
  }

  moveDown(): this {
    return this;
  }

  addPage(): this {
    return this;
  }

  end(): void {
    // Simulate PDF generation completion
    if (this.callbacks['data']) {
      this.callbacks['data'](Buffer.from('mock-pdf-data'));
    }
    if (this.callbacks['end']) {
      this.callbacks['end']();
    }
  }
}

export default PDFDocumentMock;
