import 'package:openai_prompt_runner/src/storage.dart';
import 'package:sqlite3/sqlite3.dart';

const String promptsTable = '''
CREATE TABLE 
  prompts (
    run_started_at DATETIME not null default CURRENT_TIMESTAMP,
    prompt_sent_at DATETIME not null,
    updated_at DATETIME not null,
    run_tag TEXT null,
    tag TEXT null,
    status TEXT not null,
    prompt_tokens INTEGER NULL,
    total_tokens INTEGER NULL,
    request TEXT null,
    response TEXT null,
    retries INTEGER null,
    primary key (run_started_at, prompt_sent_at)
  )
''';

/// SQLite implemetaion that saves prompt metadata to local file
/// Check for 'prompts' table, creates one if not present, check for
/// schema if present, fails if schema is not expected,
/// Here's how the table looks
/// ```
/// CREATE TABLE
// prompts (
///   run_started_at DATETIME not null default CURRENT_TIMESTAMP,
///   prompt_sent_at DATETIME not null,
///   prompt_updated_at DATETIME not null,
///   run_tag TEXT null,
///   tag TEXT null,
///   status TEXT not null,
///   prompt_tokens INTEGER NULL,
///   total_tokens INTEGER NULL,
///   request TEXT null,
///   response TEXT null,
///   retries INTEGER null,
///   primary key (run_started_at, prompt_sent_at)
/// )
///```
class PromptMetadataSqlite implements PromptMetadadataStorage {
  final String sqliteFile;

  PromptMetadataSqlite([this.sqliteFile = 'runs.sqlite']) {
    _checkPromptsTableExists();
  }

  void _wrapDbCall(Function(Database db) f) {
    wrapSqliteCall(sqliteFile, f);
  }

  void _checkPromptsTableExists() {
    _wrapDbCall((db) {
      final result = db.select(
          'SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'prompts\'');

      if (result.length > 1) {
        throw Exception('There\'re multiple \'prompts\' tables');
      }

      if (result.isEmpty) {
        _createPromptsTable();
      } else {
        final columns = db
            .select('PRAGMA table_info(prompts)')
            .map((e) => e['name'] as String)
            .toSet();

        final expectedColumns = {
          'run_started_at',
          'prompt_sent_at',
          'updated_at',
          'run_tag',
          'tag',
          'status',
          'prompt_tokens',
          'total_tokens',
          'request',
          'response',
          'retries'
        };

        if (columns != expectedColumns) {
          throw Exception(
              'Prompts table schema does not match expected schema');
        }
      }
    });
  }

  void _createPromptsTable() {
    _wrapDbCall((db) {
      db.execute(promptsTable);
    });
  }

  @override
  void addPromptSent(DateTime runStartedAt, DateTime promtStartedAt,
      String? runTag, String? tag, String? request) {
    _wrapDbCall((db) {
      db.execute(
          "INSERT INTO prompts (run_started_at, prompt_sent_at, updated_at, runTag, tag, status, request) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            runStartedAt.toIso8601String(),
            promtStartedAt.toIso8601String(),
            DateTime.now().toIso8601String(),
            runTag,
            tag,
            'SENT',
            request,
          ]);
    });
  }

  @override
  void updatePromptSuccess(DateTime runStartedAt, DateTime promtStartedAt,
      int promptTokens, int totalTokens, String? response) async {
    _wrapDbCall((db) {
      db.execute(
          "UPDATE prompts SET updated_at = ?, status = ?, prompt_tokens = ?, total_tokens = ?, response = ? WHERE run_started_at = ?, prompt_sent_at = ?",
          [
            DateTime.now().toIso8601String(),
            'SUCCESS',
            promptTokens,
            totalTokens,
            response,
            runStartedAt.toIso8601String(),
            promtStartedAt.toIso8601String()
          ]);
    });
  }

  @override
  void updatePromptError(DateTime runStartedAt, DateTime promtStartedAt,
      String? response, int retriesDone) async {
    _wrapDbCall((db) {
      db.execute(
          "UPDATE prompts SET updated_at = ?, status = ?, response = ?, retries = ? WHERE run_started_at = ?, prompt_sent_at = ?",
          [
            DateTime.now().toIso8601String(),
            'ERROR',
            response,
            retriesDone,
            runStartedAt.toIso8601String(),
            promtStartedAt.toIso8601String()
          ]);
    });
  }
}

/// Opens SQLite db from a given file, wraps it in try/finally, disposes connection upon exit
void wrapSqliteCall(String fileName, Function(Database db) f) {
  var database = sqlite3.open(fileName);
  try {
    f(database);
  } finally {
    database.dispose();
  }
}
