import * as github from '@actions/github'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {send, ConfigOptions} from '../src/slack'
import {readFileSync} from 'fs'
import * as yaml from 'js-yaml'

const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
const jobName = 'CI Tests'
const jobStatus = 'failure'
const jobSteps = {
  'install-deps': {
    outputs: {},
    outcome: 'success',
    conclusion: 'success'
  },
  hooks: {
    outputs: {},
    outcome: 'cancelled',
    conclusion: 'cancelled'
  },
  lint: {
    outputs: {},
    outcome: 'failure',
    conclusion: 'failure'
  },
  types: {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
  },
  'unit-test': {
    outputs: {},
    outcome: 'skipped',
    conclusion: 'skipped'
  },
  'integration-test': {
    outputs: {},
    outcome: 'failure',
    conclusion: 'failure'
  }
}
const channel = '#github-ci'

// mock github context
const dump = JSON.parse(readFileSync('./__tests__/fixtures/push.json', 'utf-8'))

github.context.payload = dump.event
github.context.eventName = dump.event_name
github.context.sha = dump.sha
github.context.ref = dump.ref
github.context.workflow = dump.workflow
github.context.action = dump.action
github.context.actor = dump.actor

process.env.CI = 'true'
process.env.GITHUB_WORKFLOW = 'build-test'
process.env.GITHUB_RUN_ID = '100143423'
process.env.GITHUB_RUN_NUMBER = '8'
process.env.GITHUB_ACTION = 'self2'
process.env.GITHUB_ACTIONS = 'true'
process.env.GITHUB_ACTOR = 'satterly'
process.env.GITHUB_REPOSITORY = 'act10ns/slack'
process.env.GITHUB_EVENT_NAME = 'push'
process.env.GITHUB_EVENT_PATH = '/home/runner/work/_temp/_github_workflow/event.json'
process.env.GITHUB_WORKSPACE = '/home/runner/work/slack/slack'
process.env.GITHUB_SHA = '68d48876e0794fba714cb331a1624af6b20942d8'
process.env.GITHUB_REF = 'refs/heads/master'
process.env.GITHUB_REF_TYPE = 'branch'
process.env.GITHUB_REF_NAME = 'master'
process.env.GITHUB_HEAD_REF = ''
process.env.GITHUB_BASE_REF = ''
process.env.GITHUB_SERVER_URL = 'https://github.com'
process.env.GITHUB_API_URL = 'https://github.com'
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

test('custom config of slack action using legacy attachments', async () => {
  const mockAxios = new MockAdapter(axios, {delayResponse: 200})

  mockAxios
    .onPost()
    .reply(config => {
      console.log(config.data)
      return [200, {status: 'ok'}]
    })
    .onAny()
    .reply(500)

  let message = undefined
  let customParameter = undefined

  let config = yaml.load(readFileSync('./__tests__/fixtures/slack-legacy.yml', 'utf-8'), {
    schema: yaml.FAILSAFE_SCHEMA
  }) as ConfigOptions

  let res = await send(url, jobName, jobStatus, jobSteps, channel, message, customParameter, config)
  await expect(res).toStrictEqual({text: {status: 'ok'}})

  expect(JSON.parse(mockAxios.history.post[0].data)).toStrictEqual({
    username: 'GitHub-CI',
    icon_url: 'https://octodex.github.com/images/mona-the-rivetertocat.png',
    channel: '#github-ci',
    attachments: [
      {
        fallback: '[GitHub] build-test #8 CI Tests is failure',
        color: '#884EA0',
        author_name: 'satterly',
        author_link: 'https://github.com/satterly',
        author_icon: 'https://avatars0.githubusercontent.com/u/615057?v=4',
        mrkdwn_in: ['pretext', 'text', 'fields'],
        pretext: 'Triggered via push by satterly action master `68d48876`',
        text:
          '*<https://github.com/act10ns/slack/actions/runs/100143423|Workflow _build-test_ job _CI Tests_ triggered by _push_ is _failure_>* for <https://github.com/act10ns/slack/commits/master|`master`>\n' +
          '<https://github.com/act10ns/slack/compare/db9fe60430a6...68d48876e079|`68d48876`> - 4 commits\n' +
          '*Commits*\n' +
          '<https://github.com/act10ns/slack/commit/b1f512300ea6e925e095c51a441fcf30104523aa|`b1f51230`> - wip\n' +
          '<https://github.com/act10ns/slack/commit/b246b5fdcc2722909503d5a43eb635885aa5fd25|`b246b5fd`> - wip\n' +
          '<https://github.com/act10ns/slack/commit/553c22356fadc36947653de987dabd8da40cb06b|`553c2235`> - wip\n' +
          '<https://github.com/act10ns/slack/commit/68d48876e0794fba714cb331a1624af6b20942d8|`68d48876`> - wip\n',
        title: 'GitHub Actions',
        title_link: 'https://support.github.com',
        fields: [
          {
            short: false,
            title: 'Job Steps',
            value: ':white_check_mark: install-deps\n:x: hooks\n:grimacing: lint\n:grimacing: integration-test\n'
          },
          {
            short: true,
            title: 'Workflow',
            value: '<https://github.com/act10ns/slack/actions?query=workflow:build-test|build-test>'
          },
          {
            short: true,
            title: 'Git Ref',
            value: 'master (branch)'
          },
          {
            short: true,
            title: 'Run ID',
            value: '<https://github.com/act10ns/slack/actions/runs/100143423|100143423>'
          },
          {
            short: true,
            title: 'Run Number',
            value: '8'
          },
          {
            short: true,
            title: 'Actor',
            value: 'satterly'
          },
          {
            short: true,
            title: 'Job Status',
            value: 'failure'
          }
        ],
        footer: '<https://github.com/act10ns/slack|act10ns/slack> build-test #8',
        footer_icon: 'https://github.githubassets.com/favicon.ico',
        ts: expect.stringMatching(/[0-9]+/)
      }
    ]
  })

  mockAxios.resetHistory()
  mockAxios.reset()
})
