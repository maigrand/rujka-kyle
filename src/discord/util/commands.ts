import { PermissionsBitField } from 'discord.js';

type Option = {
  name: string,
  description: string,
  type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE',
  required: boolean,
  monitoringServerNamesChoices?: boolean,
};

type Command = {
  name: string,
  description: string,
  defaultPermission: bigint,
  options?: Option[],
};

type CommandKeys =
    'monitoringAdd' | 'monitoringList' | 'monitoringEdit' | 'monitoringDelete' | 'monitoringRebuild' |
    'rconip' | 'rconname';

export const commands: { [key in CommandKeys]: Command } = {
  monitoringAdd: {
    name: 'madd',
    description: 'add monitoring server',
    defaultPermission: PermissionsBitField.Flags.Administrator,
    options: [
      {
        name: 'destination',
        description: 'select text channel',
        type: 'CHANNEL',
        required: true,
      },
      {
        name: 'name',
        description: 'server local name',
        type: 'STRING',
        required: true,
      },
      {
        name: 'address',
        description: 'host:port',
        type: 'STRING',
        required: true,
      },
      {
        name: 'password',
        description: 'password',
        type: 'STRING',
        required: false,
      },
    ],
  },
  monitoringList: {
    name: 'mlist',
    description: 'list monitoring servers',
    defaultPermission: PermissionsBitField.Flags.Administrator,
  },
  monitoringEdit: {
    name: 'medit',
    description: 'edit monitoring server',
    defaultPermission: PermissionsBitField.Flags.Administrator,
    options: [
      {
        name: 'name',
        description: 'server local name',
        type: 'STRING',
        required: true,
        monitoringServerNamesChoices: true,
      },
      {
        name: 'newname',
        description: 'server new local name',
        type: 'STRING',
        required: false,
      },
      {
        name: 'address',
        description: 'host:port',
        type: 'STRING',
        required: false,
      },
      {
        name: 'password',
        description: 'password',
        type: 'STRING',
        required: false,
      },
      {
        name: 'index',
        description: 'server position',
        type: 'INTEGER',
        required: false,
      },
    ],
  },
  monitoringDelete: {
    name: 'mdel',
    description: 'delete monitoring server',
    defaultPermission: PermissionsBitField.Flags.Administrator,
    options: [
      {
        name: 'name',
        description: 'server local name',
        type: 'STRING',
        required: true,
        monitoringServerNamesChoices: true,
      },
    ],
  },
  monitoringRebuild: {
    name: 'mrebuild',
    description: 'rebuild monitoring messages',
    defaultPermission: PermissionsBitField.Flags.Administrator,
  },
  rconip: {
    name: 'rconip',
    description: 'wip',
    defaultPermission: PermissionsBitField.Flags.Administrator,
    options: [
      {
        name: 'ip',
        description: 'ip',
        type: 'STRING',
        required: true,
      },
    ],
  },
  rconname: {
    name: 'rconname',
    description: 'wip',
    defaultPermission: PermissionsBitField.Flags.Administrator,
    options: [
      {
        name: 'name',
        description: 'name',
        type: 'STRING',
        required: true,
      },
    ],
  },
};
