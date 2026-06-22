# Makefile for CIT Course Report (大数据与云计算)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))/..
MAIN = thuthesis-example
PDF = $(MAIN).pdf
OUT_DIR = output
LATEX = xelatex
BIBTEX = bibtex

.PHONY: all compile clean watch

all: compile

compile:
	@echo "==> Starting Quad-Pass XeLaTeX compilation..."
	@mkdir -p $(ROOT_DIR)/$(OUT_DIR)
	cd $(ROOT_DIR) && $(LATEX) -interaction=nonstopmode $(MAIN)
	cd $(ROOT_DIR) && $(BIBTEX) $(MAIN)
	cd $(ROOT_DIR) && $(LATEX) -interaction=nonstopmode $(MAIN)
	cd $(ROOT_DIR) && $(LATEX) -interaction=nonstopmode $(MAIN)
	@if [ -f $(ROOT_DIR)/$(PDF) ]; then \
		mv $(ROOT_DIR)/$(PDF) $(ROOT_DIR)/$(OUT_DIR)/大数据与云计算课程大作业说明书.pdf; \
		echo "==> Compilation completed. Output saved to $(OUT_DIR)/大数据与云计算课程大作业说明书.pdf"; \
	else \
		echo "==> ERROR: PDF generation failed."; \
		exit 1; \
	fi

clean:
	@echo "==> Cleaning up auxiliary files..."
	cd $(ROOT_DIR) && rm -rf *.aux *.log *.toc *.lof *.lot *.out *.bbl *.blg *.synctex.gz *.run.xml *-blx.bib *.fdb_latexmk *.fls
	cd $(ROOT_DIR) && rm -rf data/*.aux
	cd $(ROOT_DIR) && rm -rf .texpadtmp
