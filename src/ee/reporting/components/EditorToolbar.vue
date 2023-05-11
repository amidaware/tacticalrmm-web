<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-bar>
    <q-btn-dropdown
      label="Formatting"
      flat
      dense
      auto-close
      :ripple="false"
      @hide="_editor.focus()"
    >
      <q-list dense>
        <q-item clickable @click="insertHeader('#')">
          <q-item-section>
            <q-item-label>Heading 1</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('##')">
          <q-item-section>
            <q-item-label>Heading 2</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('###')">
          <q-item-section>
            <q-item-label>Heading 3</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('####')">
          <q-item-section>
            <q-item-label>Heading 4</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('#####')">
          <q-item-section>
            <q-item-label>Heading 5</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('######')">
          <q-item-section>
            <q-item-label>Heading 6</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>

    <q-btn-dropdown
      label="Section"
      flat
      dense
      auto-close
      :ripple="false"
      @hide="_editor.focus()"
    >
      <q-list dense>
        <q-item clickable @click="insertSection('section')">
          <q-item-section>
            <q-item-label>Section</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('chapter')">
          <q-item-section>
            <q-item-label>Chapter</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('header')">
          <q-item-section>
            <q-item-label>Header</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('footer')">
          <q-item-section>
            <q-item-label>Footer</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('nav')">
          <q-item-section>
            <q-item-label>Nav</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('div')">
          <q-item-section>
            <q-item-label>Div</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable @click="insertSection('article')">
          <q-item-section>
            <q-item-label>Article</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>

    <q-btn flat dense :ripple="false" icon="format_bold" @click="insertBold">
      <q-tooltip :delay="500">Bold</q-tooltip>
    </q-btn>
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_italic"
      @click="insertItalic"
    >
      <q-tooltip :delay="500">Italic</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_list_numbered"
      @click="insertNumberedList"
    >
      <q-tooltip :delay="500">Numbered List</q-tooltip>
    </q-btn>
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_list_bulleted"
      @click="insertBulletList"
    >
      <q-tooltip :delay="500">Bullet List</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_quote"
      @click="insertBlockQuote"
    >
      <q-tooltip :delay="500">Block Quote</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn flat dense :ripple="false" icon="undo" @click="undo">
      <q-tooltip :delay="500">Undo</q-tooltip>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="redo" @click="redo">
      <q-tooltip :delay="500">Redo</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn flat dense :ripple="false" icon="code" @click="insertCodeBlock">
      <q-tooltip :delay="500">Code Block</q-tooltip>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="link">
      <q-tooltip :delay="500">Link</q-tooltip>
      <q-menu>
        <div class="no-wrap q-pa-md">
          <div class="text-subtitle1">Create Link</div>
          <q-input v-model="linkText" label="Text" type="text" />

          <q-input v-model="linkUrl" label="Url" type="text" />

          <q-btn
            v-close-popup
            color="primary"
            label="Insert Link"
            class="full-width q-mt-sm"
            flat
            dense
            @click="insertLink"
          />
        </div>
      </q-menu>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="image" @click="insertImage">
      <q-tooltip :delay="500">Image</q-tooltip>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="horizontal_rule" @click="insertHr">
      <q-tooltip :delay="500">Horizontal Rule</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn
      flat
      dense
      :ripple="false"
      icon="mdi-database-plus-outline"
      @click="$q.dialog({ component: ReportDataQueryForm })"
    >
      <q-tooltip :delay="500">Add Data Query</q-tooltip>
    </q-btn>
    <q-btn
      flat
      dense
      :ripple="false"
      icon="mdi-database-arrow-down"
      @click="insertDataQuery"
    >
      <q-tooltip :delay="500">Insert Data Query</q-tooltip>
    </q-btn>
    <q-btn
      flat
      dense
      :ripple="false"
      icon="mdi-table-large-plus"
      @click="insertTable"
    >
      <q-tooltip :delay="500">Table</q-tooltip>
    </q-btn>
    <!-- TODO: chart insert -->
    <q-btn flat dense :ripple="false" icon="add_chart">
      <q-tooltip :delay="500">Chart</q-tooltip>
    </q-btn>
  </q-bar>
</template>

<script setup lang="ts">
// composition imports
import { ref, toRaw, onMounted } from "vue";
import { useQuasar } from "quasar";
import * as monaco from "monaco-editor";

// ui import
import ReportDataQueryForm from "./ReportDataQueryForm.vue";
import DataQuerySelect from "./DataQuerySelect.vue";
import ReportAssetSelect from "./ReportAssetSelect.vue";

// props
const props = defineProps<{ editor: monaco.editor.IStandaloneCodeEditor }>();

const $q = useQuasar();

const _editor = toRaw(props.editor);
const isMultiLineSelection = ref(false);

// link insert refs
const linkUrl = ref("");
const linkText = ref("");

onMounted(() => {
  // disable certain toolbar options if a multiline text selection is made
  _editor.onDidChangeCursorSelection((evt) => {
    isMultiLineSelection.value = monaco.Selection.spansMultipleLines(
      evt.selection
    );
  });
});

// toolbar actions
function insertHeader(header: string) {
  insertPrefix("#", header.length);
  _editor.focus();
}

function insertBold() {
  insertWrap("**", "**");
  _editor.focus();
}

function insertItalic() {
  insertWrap("*", "*");
  _editor.focus();
}

function insertNumberedList() {
  insertPrefix("1.");
  _editor.focus();
}

function insertBulletList() {
  insertPrefix("*");
  _editor.focus();
}

function insertBlockQuote() {
  insertPrefix(">");
  _editor.focus();
}

function insertCodeBlock() {
  if (isMultiLineSelection.value) {
    insertWrap("```\n", "\n```", true);
  } else {
    insertWrap("`", "`");
  }
  _editor.focus();
}

function insertDataQuery() {
  $q.dialog({
    component: DataQuerySelect,
  }).onOk((query: string) => insert(query));
}

function insertLink() {
  insert(`[${linkText.value}](${linkUrl.value})`);
  _editor.focus();
}

function insertImage() {
  $q.dialog({
    component: ReportAssetSelect,
  })
    .onOk((text) => {
      insert(text);
    })
    .onDismiss(() => _editor.focus());
}

function redo() {
  _editor.trigger("toolbar", "redo", null);
  _editor.focus();
}

function undo() {
  _editor.trigger("toolbar", "undo", null);
  _editor.focus();
}

function insertHr() {
  insert("---", true);
  _editor.focus();
}

function insertTable() {
  insert("\\table(data_source_name)", true);
  _editor.focus();
}

type Section =
  | "article"
  | "div"
  | "section"
  | "header"
  | "footer"
  | "nav"
  | "chapter";

function insertSection(section: Section) {
  const tag = section.slice(0, 1).toUpperCase();
  insertWrap(`~~${tag}~~\n`, `\n~~/${tag}~~`, true);
  _editor.focus();
}

// inserts text on a new line below the cursor position
function insert(text: string, moveToNewLine = false) {
  const model = _editor.getModel();
  const selections = _editor.getSelections();
  if (!model || !selections) return;

  let operations = [] as monaco.editor.IIdentifiedSingleEditOperation[];
  for (let selection of selections) {
    const end = selection.getEndPosition();

    let editSelection = moveToNewLine
      ? monaco.Selection.fromPositions({
          lineNumber: end.lineNumber,
          column: model.getLineMaxColumn(end.lineNumber),
        })
      : selection;

    const editText = moveToNewLine ? `\n${text}\n` : text;
    operations.push({
      text: editText,
      range: editSelection,
      forceMoveMarkers: true,
    });
  }

  model.pushEditOperations(selections, operations, null);
}

// inserts a prefix before selected text
function insertPrefix(prefix: string, prefixCount = 1) {
  const model = _editor.getModel();
  const selections = _editor.getSelections();
  if (!model || !selections) return;

  let operations = [] as monaco.editor.IIdentifiedSingleEditOperation[];
  let newSelections = [] as monaco.Selection[];
  for (let selection of selections) {
    const start = selection.getStartPosition();
    const end = selection.getEndPosition();

    let editSelection = monaco.Selection.fromPositions(
      { lineNumber: start.lineNumber, column: 0 },
      {
        lineNumber: end.lineNumber,
        column: model.getLineMaxColumn(end.lineNumber),
      }
    );
    let replacementText = [] as string[];

    newSelections.push(editSelection);

    // loop over line numbers
    for (let i = start.lineNumber; i <= end.lineNumber; i++) {
      let text = model?.getLineContent(i).trimStart();

      // prefix and prefix character amount match so should toggle off prefix in editor
      const re_toggle = new RegExp(`^${prefix}{${prefixCount}}\\s`);
      const re_replace = new RegExp(`^${prefix}+\\s`);

      if (text.match(re_toggle)) {
        // remove prefix since it is present already (toggled off)
        text = text.replace(prefix.repeat(prefixCount), "").trimStart();
      } else {
        // add prefix
        text = `${prefix.repeat(prefixCount)} ${text
          ?.replace(re_replace, "")
          .trimStart()}`;
      }

      replacementText.push(text);
    }

    operations.push({
      text: replacementText.join("\n"),
      range: editSelection,
      forceMoveMarkers: true,
    });
  }

  model.pushEditOperations(
    selections,
    operations,
    (/* operations */) => newSelections
  );
}

// wraps selected text beginning with a prefix and ending with a suffix
function insertWrap(prefix: string, suffix: string, includeWholeLine = false) {
  const model = _editor.getModel();
  const selections = _editor.getSelections();
  if (!model || !selections) return;

  let operations = [] as monaco.editor.IIdentifiedSingleEditOperation[];
  for (let selection of selections) {
    const start = selection.getStartPosition();
    const end = selection.getEndPosition();

    let editSelection = includeWholeLine
      ? monaco.Selection.fromPositions(
          { lineNumber: start.lineNumber, column: 0 },
          {
            lineNumber: end.lineNumber,
            column: model.getLineMaxColumn(end.lineNumber),
          }
        )
      : selection;

    const text = `${prefix}${model.getValueInRange(editSelection)}${suffix}`;

    operations.push({
      text: text,
      range: editSelection,
      forceMoveMarkers: true,
    });
  }

  model.pushEditOperations(selections, operations, (operations) => {
    console.log(operations);
    return operations.map((operation) =>
      monaco.Selection.fromRange(operation.range, monaco.SelectionDirection.LTR)
    );
  });
}
</script>