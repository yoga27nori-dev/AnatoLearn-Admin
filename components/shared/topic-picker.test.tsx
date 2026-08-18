import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const searchTopics = vi.fn();
vi.mock("@/app/(admin)/topic-picker-actions", () => ({ searchTopicOptionsAction: (...args: unknown[]) => searchTopics(...args) }));

import { TopicPicker } from "./topic-picker";

beforeEach(() => {
  searchTopics.mockReset();
});

test("searches every eligible topic and stores the selected UUID in the form", async () => {
  searchTopics
    .mockResolvedValueOnce({
      items: [{ id: "topic-heart", title: "Heart anatomy", organSystemName: "Circulatory" }],
      pagination: { page: 1, pageSize: 12, total: 107, totalPages: 9 },
      selected: { id: "topic-heart", title: "Heart anatomy" },
    })
    .mockResolvedValueOnce({
      items: [{ id: "topic-vas", title: "Vas Deferens & Vasectomy", organSystemName: "Reproductive" }],
      pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      selected: { id: "topic-heart", title: "Heart anatomy" },
    });
  const user = userEvent.setup();
  const { container } = render(<TopicPicker initialLabel="Heart anatomy" label="Topic" name="topicId" value="topic-heart" />);

  expect(container.querySelector('input[name="topicId"]')).toHaveValue("topic-heart");
  expect(screen.getByText("Heart anatomy")).toBeInTheDocument();

  expect(screen.queryByRole("button", { name: "Choose topic" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Change topic" }));
  expect(searchTopics).toHaveBeenCalledWith({ page: 1, search: "", selectedId: "topic-heart" });

  await user.type(screen.getByRole("searchbox", { name: "Search topics" }), "vas deferens");
  await user.click(screen.getByRole("button", { name: "Search" }));
  expect(searchTopics).toHaveBeenLastCalledWith({ page: 1, search: "vas deferens", selectedId: "topic-heart" });

  await user.click(await screen.findByRole("button", { name: "Select Vas Deferens & Vasectomy" }));
  expect(container.querySelector('input[name="topicId"]')).toHaveValue("topic-vas");
  expect(screen.getByText("Vas Deferens & Vasectomy")).toBeInTheDocument();
});

test("keeps topic results paginated instead of truncating the selector", async () => {
  searchTopics
    .mockResolvedValueOnce({
      items: [{ id: "topic-a", title: "Anatomy", organSystemName: "General" }],
      pagination: { page: 1, pageSize: 12, total: 13, totalPages: 2 },
      selected: null,
    })
    .mockResolvedValueOnce({
      items: [{ id: "topic-vas", title: "Vas Deferens & Vasectomy", organSystemName: "Reproductive" }],
      pagination: { page: 2, pageSize: 12, total: 13, totalPages: 2 },
      selected: null,
    });
  const user = userEvent.setup();
  render(<TopicPicker label="Topic" name="topicId" />);

  await user.click(screen.getByRole("button", { name: "Choose topic" }));
  const next = await screen.findByRole("button", { name: "Next" });
  await waitFor(() => expect(next).toBeEnabled());
  await user.click(next);

  expect(searchTopics).toHaveBeenLastCalledWith({ page: 2, search: "" });
  expect(await screen.findByText("Vas Deferens & Vasectomy")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
});

test("lets list filters clear the selected topic", async () => {
  const user = userEvent.setup();
  const { container } = render(<TopicPicker initialLabel="Heart anatomy" label="Topic" name="topicId" required={false} value="topic-heart" />);

  await user.click(screen.getByRole("button", { name: "Clear Topic" }));

  expect(container.querySelector('input[name="topicId"]')).toHaveValue("");
  expect(screen.getByText("Filter results by curriculum topic.")).toBeInTheDocument();
});

test("does not submit the surrounding form when opening the picker", async () => {
  searchTopics.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 }, selected: null });
  const submit = vi.fn();
  const user = userEvent.setup();
  render(<form onSubmit={(event) => { event.preventDefault(); submit(); }}><TopicPicker label="Topic" name="topicId" /></form>);

  await user.click(screen.getByRole("button", { name: "Choose topic" }));

  expect(submit).not.toHaveBeenCalled();
});
