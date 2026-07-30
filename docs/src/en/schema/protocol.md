<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->
<div style="text-align: center;">
  <h1>Schema Protocol Specification</h1>
</div>

The Schema protocol is a JSON-based declarative UI description protocol used to define and render user interfaces. It uses a tree structure to describe component hierarchy and supports dynamic data binding and event handling.

## Overview

The Schema protocol describes a complete UI structure through JSON objects, including:

- **Component tree structure**: Describes component hierarchy through nested node objects
- **Component properties**: Each component can configure properties supporting primitive values, JS expressions, JS functions, and more
- **State management**: Manages page-level state data through the `state` field
- **Event handling**: Defines reusable methods through the `methods` field; component properties can bind to these methods

### Design Principles

1. **Declarative**: Uses declarative structures to describe UI rather than imperative operations
2. **Platform-agnostic**: The protocol itself is not tied to a specific framework; implementations are mapped through a component registry
3. **Type-safe**: Ensures Schema structure correctness through type definitions
4. **Extensible**: Supports custom components and property types

## Core Concepts

### Schema Object

A Schema is a JSON object containing a complete page definition. It must include the `componentName` field, typically `"Page"`.

### Node

A node is the basic unit in the component tree; each node represents a UI component. A node includes:
- `componentName`: Component name (required)
- `id`: Unique node identifier (optional, but recommended)
- `props`: Component properties
- `children`: Child node array
- Other optional fields: `slot`, `loop`, `condition`, etc.

### RootNode

The root node is the top-level node of a Schema. In addition to all fields of a regular node, it includes page-level configuration:
- `state`: Global state
- `methods`: Method collection
- `css`: Global styles

## Data Structures

### RootNode Type Definition

```typescript
type RootNode = Omit<Node, 'id'> & {
  id?: string;                    // Optional id for root node
  css?: string;                   // Global CSS style string
  fileName?: string;              // File name
  methods?: Methods;              // Method collection
  state?: Record<string, unknown>; // Global state
  schema?: any;                   // Embedded or external Schema
};
```

### Node Type Definition

```typescript
interface Node {
  id?: string;                    // Unique node identifier (optional)
  componentName: string;          // Component name (required)
  props?: Record<string, any> & { 
    columns?: { slots?: Record<string, any> }[] 
  };                             // Component property collection
  children?: Node[];              // Child node array
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // Node type
  slot?: string | Record<string, any>; // Slot content
  params?: string[];              // Parameter name list
  loop?: Record<string, any>;     // Loop rendering configuration
  loopArgs?: string[];            // Loop parameter name list
  condition?: boolean | Record<string, any>; // Conditional rendering configuration
}
```

### Field Reference

#### Required Fields

- **componentName** (string): Component name; must match a component name in the client component registry

#### Optional Fields

- **id** (string): Unique node identifier; recommended for each node to aid debugging and event handling
- **props** (object): Component property object; keys are property names, values are property values (supports multiple types)
- **children** (Node[]): Child node array defining child components
- **componentType** ('Block' | 'PageStart' | 'PageSection'): Node type; usually omitted
- **slot** (string | object): Slot content; can be a string or object
- **params** (string[]): Parameter name list
- **loop** (object): Loop rendering configuration for list rendering
- **loopArgs** (string[]): Loop parameter name list, e.g. `["item", "index"]`
- **condition** (boolean | object): Conditional rendering configuration controlling whether the component renders

#### RootNode-Specific Fields

- **css** (string): Global CSS style string
- **fileName** (string): File name identifier
- **methods** (Methods): Method collection defining reusable functions
- **state** (Record<string, unknown>): Global state object
- **schema** (any): Embedded or external Schema

## Property Value Types

Property values (PropValue) support the following types:

### 1. Primitive Values

- `string`: String
- `number`: Number
- `boolean`: Boolean
- `null`: null value

### 2. JS Expression (JSExpression)

Used for dynamically computing property values; supports accessing state and executing calculations.

```typescript
interface JSExpression {
  type: 'JSExpression';          // Fixed as 'JSExpression'
  value: string;                 // Expression string
  model?: boolean;               // Whether this is a two-way binding model value
  params?: string[];                // Parameters passed by scoped slots
}
```

**Example:**
```json
{
  "text": {
    "type": "JSExpression",
    "value": "this.state.userName + ' - ' + this.state.userHandle"
  }
}
```

**Two-way binding example:**
```json
{
  "value": {
    "type": "JSExpression",
    "value": "this.state.inputValue",
    "model": true
  }
}
```

### 3. JS Function (JSFunction)

Used to define event handler functions.

```typescript
interface JSFunction {
  type: 'JSFunction';            // Fixed as 'JSFunction'
  value: string;                 // Function body string (serializable)
}
```

**Example:**
```json
{
  "onClick": {
    "type": "JSFunction",
    "value": "function() { alert('Button clicked'); }"
  }
}
```

### 4. Slot (JSSlot)

Used to define slot content.

```typescript
interface JSSlot {
  type: 'JSSlot';                // Fixed as 'JSSlot'
  value: string | Record<string, any>; // Slot content
}
```

### 5. Arrays and Objects

Property values can be arrays or objects, supporting nested structures.

```json
{
  "items": ["item1", "item2", "item3"],
  "config": {
    "key1": "value1",
    "key2": {
      "type": "JSExpression",
      "value": "this.state.dynamicValue"
    }
  }
}
```

### 6. Special Structure: columns

For table and similar components, `props` supports a special `columns` structure:

```json
{
  "props": {
    "columns": [
      {
        "prop": "name",
        "label": "Name",
        "slots": {
          "default": "custom-name-slot"
        }
      }
    ]
  }
}
```

## Component Rendering

### Basic Rendering

Components are specified via the `componentName` field; the client looks up the corresponding implementation in the component registry.

```json
{
  "componentName": "Text",
  "id": "text-1",
  "props": {
    "text": "Hello World"
  }
}
```

### Nested Rendering

Child components are defined through the `children` field, forming a component tree.

```json
{
  "componentName": "CanvasFlexBox",
  "id": "container",
  "props": {
    "flexDirection": "column"
  },
  "children": [
    {
      "componentName": "Text",
      "id": "title",
      "props": {
        "text": "Title"
      }
    },
    {
      "componentName": "Text",
      "id": "content",
      "props": {
        "text": "Content"
      }
    }
  ]
}
```

### Conditional Rendering

The `condition` field controls whether a component renders.

```json
{
  "componentName": "Text",
  "id": "conditional-text",
  "condition": {
    "type": "JSExpression",
    "value": "this.state.isVisible"
  },
  "props": {
    "text": "Conditionally rendered text"
  }
}
```

Or use a boolean value:

```json
{
  "componentName": "Text",
  "id": "conditional-text",
  "condition": true,
  "props": {
    "text": "Conditionally rendered text"
  }
}
```

### Loop Rendering

List rendering is implemented through the `loop` and `loopArgs` fields.

```json
{
  "componentName": "div",
  "id": "list-item",
  "loop": {
    "list": {
      "type": "JSExpression",
      "value": "this.state.items"
    }
  },
  "loopArgs": ["item", "index"],
  "props": {
    "style": "padding: 10px;"
  },
  "children": [
    {
      "componentName": "Text",
      "id": "item-text",
      "props": {
        "text": {
          "type": "JSExpression",
          "value": "item.name"
        }
      }
    }
  ]
}
```

### Slot Rendering

Slot content is defined through the `slot` field.

```json
{
  "componentName": "Card",
  "id": "card-1",
  "slot": "Slot content text"
}
```

Or define multiple slots using an object:

```json
{
  "componentName": "Card",
  "id": "card-1",
  "slot": {
    "header": "Header content",
    "footer": "Footer content"
  }
}
```

## State Management

### Defining State

Define global state in the `state` field of the root node.

```json
{
  "componentName": "Page",
  "state": {
    "userName": "John Doe",
    "userAge": 25,
    "isLoggedIn": true,
    "userProfile": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Using State

Access state in component properties through JS expressions using `this.state`.

```json
{
  "componentName": "Text",
  "id": "user-name",
  "props": {
    "text": {
      "type": "JSExpression",
      "value": "this.state.userName"
    }
  }
}
```

### Two-Way Binding

For form components, use `model: true` to implement two-way binding.

```json
{
  "componentName": "Input",
  "id": "user-input",
  "props": {
    "value": {
      "type": "JSExpression",
      "value": "this.state.inputValue",
      "model": true
    }
  }
}
```

## Event Handling

### Defining Methods

Define reusable methods in the `methods` field of the root node.

```json
{
  "componentName": "Page",
  "state": {
    "formData": {
      "name": "",
      "email": ""
    }
  },
  "methods": {
    "handleSubmit": {
      "type": "JSFunction",
      "value": "function($event) { console.log('Triggered event object', $event); console.log('Submit data:', this.state.formData); }"
    }
  }
}
```

### Binding Events

Bind event handler functions in component properties.

**Option 1: Reference a method from methods**
```json
{
  "componentName": "TinyButton",
  "id": "submit-btn",
  "props": {
    "text": "Submit",
    "onClick": {
      "type": "JSExpression",
      "value": "this.handleSubmit"
    }
  }
}
```

**Option 2: Define JSFunction directly**
```json
{
  "componentName": "TinyButton",
  "id": "submit-btn",
  "props": {
    "text": "Submit",
    "onClick": {
      "type": "JSFunction",
      "value": "function() { console.log('Submit button clicked'); }"
    }
  }
}
```

## Complete Examples

### Example 1: Simple Page

```json
{
  "componentName": "Page",
  "fileName": "SimplePage",
  "css": ".page-base-style {\n  padding: 24px;\n  background: #FFFFFF;\n}",
  "props": {
    "className": "page-base-style"
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "id": "container",
      "props": {
        "flexDirection": "column",
        "justifyContent": "center",
        "alignItems": "center"
      },
      "children": [
        {
          "componentName": "Text",
          "id": "title",
          "props": {
            "text": "Welcome to the Schema Protocol",
            "style": "font-size: 24px; font-weight: bold; margin-bottom: 20px;"
          }
        },
        {
          "componentName": "Text",
          "id": "subtitle",
          "props": {
            "text": "A declarative Schema-based UI rendering protocol",
            "style": "font-size: 16px; color: #666;"
          }
        }
      ]
    }
  ],
  "state": {},
  "methods": {},
  "id": "body"
}
```

### Example 2: Page with State and Events

```json
{
  "componentName": "Page",
  "fileName": "UserProfile",
  "css": ".page-base-style {\n  padding: 24px;\n}",
  "props": {
    "className": "page-base-style"
  },
  "state": {
    "userName": "John Doe",
    "userAvatar": "https://www.example.com/avatar.jpg",
    "userBio": "Full-stack developer"
  },
  "methods": {
    "handleClick": {
      "type": "JSFunction",
      "value": "function() { alert('Button clicked!'); }"
    }
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "id": "profile-container",
      "props": {
        "flexDirection": "column",
        "alignItems": "center",
        "gap": "20px"
      },
      "children": [
        {
          "componentName": "img",
          "id": "avatar",
          "props": {
            "src": {
              "type": "JSExpression",
              "value": "this.state.userAvatar"
            },
            "style": "width: 100px; height: 100px; border-radius: 50%;"
          }
        },
        {
          "componentName": "Text",
          "id": "name",
          "props": {
            "text": {
              "type": "JSExpression",
              "value": "this.state.userName"
            },
            "style": "font-size: 24px; font-weight: bold;"
          }
        },
        {
          "componentName": "Text",
          "id": "bio",
          "props": {
            "text": {
              "type": "JSExpression",
              "value": "this.state.userBio"
            },
            "style": "font-size: 16px; color: #666;"
          }
        },
        {
          "componentName": "TinyButton",
          "id": "action-btn",
          "props": {
            "text": "Click me",
            "onClick": {
              "type": "JSExpression",
              "value": "this.handleClick"
            }
          }
        }
      ]
    }
  ],
  "id": "body"
}
```

### Example 3: List with Loop Rendering

```json
{
  "componentName": "Page",
  "fileName": "ProductList",
  "state": {
    "products": [
      { "id": 1, "name": "Product A", "price": 100 },
      { "id": 2, "name": "Product B", "price": 200 },
      { "id": 3, "name": "Product C", "price": 300 }
    ]
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "id": "product-list",
      "props": {
        "flexDirection": "column",
        "gap": "10px"
      },
      "children": [
        {
          "componentName": "div",
          "id": "product-item",
          "loop": {
            "list": {
              "type": "JSExpression",
              "value": "this.state.products"
            }
          },
          "loopArgs": ["item", "index"],
          "props": {
            "style": "padding: 10px; border: 1px solid #ddd; border-radius: 4px;"
          },
          "children": [
            {
              "componentName": "Text",
              "id": "product-name",
              "props": {
                "text": {
                  "type": "JSExpression",
                  "value": "item.name"
                },
                "style": "font-size: 18px; font-weight: bold;"
              }
            },
            {
              "componentName": "Text",
              "id": "product-price",
              "props": {
                "text": {
                  "type": "JSExpression",
                  "value": "'Price: ¥' + item.price"
                },
                "style": "font-size: 16px; color: #666;"
              }
            }
          ]
        }
      ]
    }
  ],
  "methods": {},
  "id": "body"
}
```

## Type Definitions

### Complete TypeScript Type Definitions

```typescript
// JS expression
export type JSExpression = { 
  type: 'JSExpression'; 
  value: string; 
  model?: boolean;
  params?: string[];
};

// JS function
export type JSFunction = { 
  type: 'JSFunction'; 
  value: string; 
};

// Slot
export type JSSlot = { 
  type: 'JSSlot'; 
  value: string | Record<string, any> 
};

// Method collection
export type Methods = Record<string, JSFunction>;

// Property value type (recursive)
export type PropValue =
  | string
  | number
  | boolean
  | null
  | JSExpression
  | JSFunction
  | JSSlot
  | PropValue[]
  | Record<string, PropValue>;

// Node interface
export interface Node {
  id?: string;                    // Unique node identifier (optional)
  componentName: string;           // Component name (required)
  props?: Record<string, any> & { 
    columns?: { slots?: Record<string, any> }[] 
  };                              // Component property collection
  children?: Node[];              // Child node array
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // Node type
  slot?: string | Record<string, any>; // Slot content
  params?: string[];               // Parameter name list
  loop?: Record<string, any>;      // Loop rendering configuration
  loopArgs?: string[];             // Loop parameter name list
  condition?: boolean | Record<string, any>; // Conditional rendering configuration
}

// Root node type
export type RootNode = Omit<Node, 'id'> & {
  id?: string;                    // Optional id for root node
  css?: string;                   // Global CSS style string
  fileName?: string;              // File name
  methods?: Methods;               // Method collection
  state?: Record<string, unknown>; // Global state
  schema?: any;                    // Embedded or external Schema
};
```

## Common Components

### Layout Components

- **CanvasFlexBox**: Flexbox layout container
  - `flexDirection`: Main axis direction ('row' | 'column')
  - `justifyContent`: Main axis alignment
  - `alignItems`: Cross axis alignment
  - `wrap`: Whether to wrap
  - `gap`: Spacing

- **div**: Generic container
  - `style`: Inline style string
  - `className`: CSS class name

### Basic Components

- **Text**: Text component
  - `text`: Text content
  - `style`: Style string

- **img**: Image component
  - `src`: Image URL
  - `alt`: Alternative text
  - `style`: Style string

### Business Components

- **TinyTabs**: Tabs component
  - `modelValue`: Currently active tab
  - `className`: CSS class name

- **TinyTabItem**: Tab item
  - `title`: Tab title
  - `name`: Tab name

- **TinyCarousel**: Carousel component
  - `height`: Height
  - `autoplay`: Whether to autoplay
  - `interval`: Switch interval (milliseconds)

- **TinyCarouselItem**: Carousel item
  - `title`: Item title

- **TinyButton**: Button component
  - `text`: Button text
  - `onClick`: Click event handler

## FAQ

### Q: How do I pass data between components?

A: Define global state through the `state` field; child components access state via JS expressions using `this.state`.

### Q: How do I implement conditional rendering?

A: Use the node's `condition` field, which can be a boolean value or a JS expression.

### Q: How do I implement list rendering?

A: Use the node's `loop` and `loopArgs` fields; `loop` specifies the data source, and `loopArgs` specifies loop variable names.

### Q: How do I implement two-way binding?

A: Set `model: true` in a JSExpression; applicable to form components.

### Q: How do I define component event handlers?

A: There are two approaches:
1. Define methods in the root node's `methods`, then reference them in component properties using `this.methodName` (e.g. `this.handleClick`)
2. Define JSFunction directly in component properties

## References

- [TinyEngine Protocol Specification](https://opentiny.design/tiny-engine#/protocol)
