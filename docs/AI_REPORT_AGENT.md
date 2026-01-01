# AI Report Agent

The AI Report Agent allows users to create analytics reports using natural language conversations powered by OpenAI's ChatGPT API.

## Setup

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### 2. Configure Environment Variable

Add the following to your `.env.local` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Note:** The API route also supports `OPEN_API_KEY` as an alternative variable name for backward compatibility.

**Important:** Never commit your API key to version control. The `.env.local` file should be in `.gitignore`.

## Usage

### Accessing the AI Agent

1. Navigate to **Analytics** app
2. Go to the **Reports** tab
3. Click the **"AI Assistant"** button in the top left

### Creating Reports

Simply describe what you want in natural language. Examples:

- **"Create a bar chart showing users and projects"**
- **"Show me a line chart of task completion over the last 7 days"**
- **"Make a pie chart of project status distribution"**
- **"I want a table showing all metrics for the last month"**
- **"Create a report with users, projects, and tasks as a bar chart"**

### What the AI Understands

**Metrics:**
- Users, people, members → `users`
- Projects, work, initiatives → `projects`
- Tasks, todo, work items → `tasks`
- Forms, submissions → `submissions`
- Activity, actions, events → `activities`

**Chart Types:**
- Bar chart, bars → `bar`
- Line chart, trend → `line`
- Pie chart, distribution → `pie`
- Table, list → `table`

**Date Ranges:**
- Last week → `last_7_days`
- Last month → `last_30_days`
- Last 3 months → `last_90_days`
- Today → `today`
- Yesterday → `yesterday`

### After Generation

Once the AI generates a report configuration:

1. The configuration is automatically applied to the report builder
2. The report is automatically generated
3. You can edit any aspect of the report:
   - Change chart type
   - Modify metrics
   - Adjust date range
   - Edit axis labels
   - Rename metrics (in table view)
4. Save the report for later use

## Features

- **Conversational Interface**: Natural language input
- **Context Awareness**: Remembers conversation history
- **Auto-Configuration**: Automatically sets up report parameters
- **Editable Results**: Full editing capabilities after generation
- **Error Handling**: Graceful fallbacks if API fails

## API Endpoint

The AI agent uses the `/api/analytics/ai-report` endpoint which:

- Accepts natural language messages
- Maintains conversation context
- Returns structured report configurations
- Uses OpenAI GPT-4o-mini model (cost-efficient)

## Cost Considerations

- Uses `gpt-4o-mini` model for cost efficiency
- Limited to 500 tokens per request
- Temperature set to 0.3 for consistent results
- Consider rate limiting for production use

## Troubleshooting

### "OpenAI API key not configured"
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Restart your development server after adding the key

### "Failed to generate report configuration"
- Check your API key is valid
- Verify you have OpenAI API credits
- Check browser console for detailed error messages

### AI doesn't understand my request
- Try rephrasing your request
- Be more specific about metrics and chart types
- Use the examples provided in the chat interface

