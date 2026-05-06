import Root from './dropdown-menu.svelte';
import Content from './dropdown-menu-content.svelte';
import Group from './dropdown-menu-group.svelte';
import GroupHeading from './dropdown-menu-group-heading.svelte';
import Item from './dropdown-menu-item.svelte';
import Label from './dropdown-menu-label.svelte';
import Portal from './dropdown-menu-portal.svelte';
import Separator from './dropdown-menu-separator.svelte';
import Shortcut from './dropdown-menu-shortcut.svelte';
import Sub from './dropdown-menu-sub.svelte';
import SubContent from './dropdown-menu-sub-content.svelte';
import SubTrigger from './dropdown-menu-sub-trigger.svelte';
import Trigger from './dropdown-menu-trigger.svelte';

// Checkbox/radio item variants are intentionally not exported — we don't use
// them in this codebase, and shadcn-svelte's templates trip
// noUnusedFunctionParameters on the snippet body. Re-add via
// `bun x shadcn-svelte add dropdown-menu` if needed.
export {
  Content,
  Content as DropdownMenuContent,
  Group as DropdownMenuGroup,
  Group,
  GroupHeading as DropdownMenuGroupHeading,
  GroupHeading,
  Item as DropdownMenuItem,
  Item,
  Label as DropdownMenuLabel,
  Label,
  Portal,
  Portal as DropdownMenuPortal,
  Root as DropdownMenu,
  Root,
  Separator as DropdownMenuSeparator,
  Separator,
  Shortcut as DropdownMenuShortcut,
  Shortcut,
  Sub as DropdownMenuSub,
  Sub,
  SubContent as DropdownMenuSubContent,
  SubContent,
  SubTrigger as DropdownMenuSubTrigger,
  SubTrigger,
  Trigger as DropdownMenuTrigger,
  Trigger,
};
