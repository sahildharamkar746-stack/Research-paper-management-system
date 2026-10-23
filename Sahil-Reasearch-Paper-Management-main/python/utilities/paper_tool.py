import sys
import os
import csv
import json
import sqlite3
import argparse
from datetime import datetime

"""
Research Paper Management System — Python Integration Utility
--------------------------------------------------------------
Purpose:
While core business logic, search, sorting, filtering, and CRUD operations
run natively at peak performance in C++, this Python utility handles:
1. Academic CSV batch export of papers from SQLite database.
2. Academic BibTeX export for researchers and students.
3. Batch CSV importing of external paper datasets into SQLite.
"""

def get_db_connection(db_path):
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def export_to_csv(db_path, output_csv):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, authors, abstract_text, keywords, year, venue, 
               category, doi, url, status, reading_status, favorite, added_at 
        FROM papers ORDER BY id ASC
    """)
    rows = cursor.fetchall()

    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "ID", "Title", "Authors", "Abstract", "Keywords", "Year", 
            "Venue", "Category", "DOI", "URL", "Status", "Reading Status", "Favorite", "Added At"
        ])
        for r in rows:
            writer.writerow([
                r["id"], r["title"], r["authors"], r["abstract_text"], r["keywords"],
                r["year"], r["venue"], r["category"], r["doi"], r["url"],
                r["status"], r["reading_status"], "Yes" if r["favorite"] else "No", r["added_at"]
            ])

    print(f"[Python Utility] Successfully exported {len(rows)} papers to CSV: {output_csv}")
    conn.close()

def export_to_bibtex(db_path, output_bib):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM papers ORDER BY id ASC")
    rows = cursor.fetchall()

    with open(output_bib, 'w', encoding='utf-8') as f:
        for r in rows:
            # Generate key from first author last name and year
            first_author = r["authors"].split(",")[0].strip().split()[-1].lower() if r["authors"] else "paper"
            citation_key = f"{first_author}{r['year']}_{r['id']}"
            f.write(f"@article{{{citation_key},\n")
            f.write(f"  title = {{{r['title']}}},\n")
            f.write(f"  author = {{{r['authors']}}},\n")
            f.write(f"  journal = {{{r['venue']}}},\n")
            f.write(f"  year = {{{r['year']}}},\n")
            if r["doi"]:
                f.write(f"  doi = {{{r['doi']}}},\n")
            if r["url"]:
                f.write(f"  url = {{{r['url']}}},\n")
            if r["keywords"]:
                f.write(f"  keywords = {{{r['keywords']}}},\n")
            f.write("}\n\n")

    print(f"[Python Utility] Successfully exported {len(rows)} papers to BibTeX: {output_bib}")
    conn.close()

def import_from_csv(db_path, input_csv):
    if not os.path.exists(input_csv):
        print(f"[Error] File not found: {input_csv}")
        return

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    imported = 0

    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute("""
                INSERT INTO papers (title, authors, abstract_text, keywords, year, venue, category, doi, url, status, reading_status, favorite, added_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
            """, (
                row.get("Title", ""),
                row.get("Authors", ""),
                row.get("Abstract", ""),
                row.get("Keywords", ""),
                int(row.get("Year", 2024)),
                row.get("Venue", ""),
                row.get("Category", "Artificial Intelligence"),
                row.get("DOI", ""),
                row.get("URL", ""),
                row.get("Status", "Published"),
                row.get("Reading Status", "To Read"),
                1 if row.get("Favorite", "").lower() in ["yes", "1", "true"] else 0
            ))
            imported += 1

    conn.commit()
    print(f"[Python Utility] Successfully imported {imported} papers from CSV into SQLite database.")
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Academic Paper Utility (Python Support Component)")
    parser.add_argument("--db", default="database/papers.db", help="Path to SQLite database")
    parser.add_argument("--export-csv", help="Target path to export CSV")
    parser.add_argument("--export-bibtex", help="Target path to export BibTeX")
    parser.add_argument("--import-csv", help="Source CSV file to import")

    args = parser.parse_args()

    if args.export_csv:
        export_to_csv(args.db, args.export_csv)
    elif args.export_bibtex:
        export_to_bibtex(args.db, args.export_bibtex)
    elif args.import_csv:
        import_from_csv(args.db, args.import_csv)
    else:
        # Default run: export sample CSV to demonstrate functionality
        export_to_csv(args.db, "frontend/papers_export.csv")
