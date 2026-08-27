import {
  CATEGORY_COLOR_VALUES,
  CATEGORY_ICON_NAMES,
} from "@freenary/api/lib/categories";
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES,
} from "@freenary/api/lib/mcc-categories";
import type { SpendingCategory } from "@freenary/api/lib/mcc-categories";
import { Button } from "@freenary/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@freenary/ui/components/dropdown-menu";
import { Input } from "@freenary/ui/components/input";
import { Label } from "@freenary/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@freenary/ui/components/sheet";
import { cn } from "@freenary/ui/lib/utils";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";

import {
  CategoryIcon,
  SWATCH_BY_COLOR,
} from "@/components/budget/category-icon";
import { useCustomCategoryForm } from "@/hooks/settings/use-custom-category-form";
import type { EditedCustomCategory } from "@/hooks/settings/use-custom-category-form";

const NO_PARENT = "none";

interface CustomCategorySheetProps {
  edited: EditedCustomCategory | null;
  onCreated?: (key: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const CustomCategorySheet = ({
  edited,
  onCreated,
  onOpenChange,
  open,
}: CustomCategorySheetProps) => {
  const { form, isSaving } = useCustomCategoryForm({
    edited,
    onCreated,
    onDone: () => onOpenChange(false),
  });

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="gap-0">
        <SheetHeader>
          <SheetTitle>{edited ? "Edit category" : "New category"}</SheetTitle>
          <SheetDescription>
            Custom categories can be assigned to any revenue, investment or
            outgoing in your budgeting profile.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex flex-col gap-5 overflow-y-auto px-6 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="label">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="custom-category-label">Name</Label>
                <Input
                  id="custom-category-label"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Life insurance"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-destructive text-xs" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="color">
            {(field) => (
              <div className="space-y-2">
                <span className="text-sm font-medium">Color</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLOR_VALUES.map((color) => (
                    <button
                      aria-label={color}
                      aria-pressed={field.state.value === color}
                      className={cn(
                        "ring-offset-background flex size-7 items-center justify-center rounded-full ring-offset-2",
                        SWATCH_BY_COLOR[color],
                        field.state.value === color && "ring-ring ring-2"
                      )}
                      key={color}
                      onClick={() => field.handleChange(color)}
                      type="button"
                    >
                      {field.state.value === color ? (
                        <CheckIcon className="size-3.5" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="icon">
            {(field) => (
              <div className="space-y-2">
                <span className="text-sm font-medium">Icon</span>
                <form.Subscribe selector={(state) => state.values.color}>
                  {(color) => (
                    <div className="grid grid-cols-9 gap-2">
                      {CATEGORY_ICON_NAMES.map((icon) => (
                        <button
                          aria-label={icon}
                          aria-pressed={field.state.value === icon}
                          className={cn(
                            "ring-offset-background rounded-full ring-offset-2",
                            field.state.value === icon && "ring-ring ring-2"
                          )}
                          key={icon}
                          onClick={() => field.handleChange(icon)}
                          type="button"
                        >
                          <CategoryIcon
                            className="size-7 [&_svg]:size-4"
                            color={color}
                            icon={icon}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </form.Subscribe>
              </div>
            )}
          </form.Field>

          <form.Field name="parentSlug">
            {(field) => (
              <div className="space-y-2">
                <span className="text-sm font-medium">Nested under</span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        className="w-full justify-between gap-1.5 font-normal"
                        size="sm"
                        variant="outline"
                      />
                    }
                  >
                    <span>
                      {field.state.value
                        ? CATEGORY_LABELS[field.state.value]
                        : "No parent"}
                    </span>
                    <CaretUpDownIcon className="text-muted-foreground size-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-72 overflow-y-auto"
                  >
                    <DropdownMenuRadioGroup
                      onValueChange={(value) =>
                        field.handleChange(
                          value === NO_PARENT
                            ? null
                            : (SPENDING_CATEGORIES.find(
                                (slug: SpendingCategory) => slug === value
                              ) ?? null)
                        )
                      }
                      value={field.state.value ?? NO_PARENT}
                    >
                      <DropdownMenuRadioItem value={NO_PARENT}>
                        No parent
                      </DropdownMenuRadioItem>
                      {SPENDING_CATEGORIES.map((slug) => (
                        <DropdownMenuRadioItem key={slug} value={slug}>
                          {CATEGORY_LABELS[slug]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </form.Field>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {edited ? "Save changes" : "Create category"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
