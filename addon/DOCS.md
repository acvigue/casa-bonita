# Casa Bonita

A custom Home Assistant dashboard with per-user configuration.

## Features

- **Per-user configurations**: Each user gets their own rooms, layouts, and preferences
- **Room management**: Organize entities into customizable rooms
- **Widget system**: Configure how entities are displayed
- **Admin features**: Manage users, create templates, impersonate users

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the Casa Bonita add-on
3. Start the add-on
4. Access via the sidebar panel

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `debug_mode` | Enable debug logging | `false` |

## Usage

### First-time setup

When you first access Casa Bonita, a user profile is automatically created based on your Home Assistant user. You can then:

1. Create rooms to organize your entities
2. Add entities to rooms and configure their display
3. Customize your home screen layout

### Admin features

Administrators can:

- View all users
- Impersonate other users to configure their views
- Create configuration templates
- Apply templates to new or existing users
- Copy configurations between users

## Support

For issues and feature requests, visit the [GitHub repository](https://github.com/acvigue/casa-bonita).
