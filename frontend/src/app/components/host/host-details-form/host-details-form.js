/* Copyright (C) 2016 NooBaa */

import template from './host-details-form.html';
import Observer from 'observer';
import { state$, action$ } from 'state';
import { deepFreeze, mapValues, flatMap } from 'utils/core-utils';
import { formatSize } from 'utils/size-utils';
import { getHostDisplayName } from 'utils/host-utils';
import ko from 'knockout';
import moment from 'moment';
import numeral from 'numeral';
import { openSetNodeAsTrustedModal, openConfirmDeleteHostModal } from 'action-creators';

const memoryPressureTooltip = deepFreeze({
    text: 'High Memory Pressure',
    position: 'above'
});

const portsBlockedTooltip = `Some ports might be blocked. Check the firewall settings
    and make sure that the ports range of 60100-60600 is open for inbound traffix.
    These ports are used to communicate between the storage nodes.`;

function _getProtocol({ protocol }) {
    const text = protocol === 'UNKNOWN' ? 'Unknown protocol' : protocol;
    const warning = protocol === 'UDP';
    return { text, warning };
}

function _getPortRage({ mode, ports }) {
    const { min, max } = ports || {};
    const warning = mode === 'N2N_PORTS_BLOCKED';
    const text = ports ? (min === max ? min : `${min}-${max}`) : 'Initializing';
    const tooltip = portsBlockedTooltip;

    return { text, warning, tooltip };
}

function _getServicesString({ services }) {
    const { storage, endpoint } = mapValues(
        services,
        service => service.mode !== 'DECOMMISSIONED'
    );

    if (storage && endpoint) {
        return 'Used for storage and as a S3 endpoint';

    } else if (storage) {
        return 'Used for storage';

    } else if (endpoint) {
        return 'Used as a S3 endpoint';

    } else {
        return 'All services are disabled';
    }
}

function _getMemoryInfo({ mode, memory }) {
    const hasWarning = mode === 'MEMORY_PRESSURE';
    const usage = `${formatSize(memory.used)} of ${formatSize(memory.total)}`;
    const css = hasWarning ? 'warning' : '';
    const utilization = `${numeral(memory.used/memory.total).format('%')} utilization`;
    const tooltip = memoryPressureTooltip;

    return { usage, utilization, css, hasWarning, tooltip };
}

class HostDetailsFormViewModel extends Observer {
    constructor({ name }) {
        super();

        this.hostLoaded = ko.observable(false);
        this.isDeleteButtonWorking = ko.observable();
        this.isRetrustButtonVisible = ko.observable();

        // Daemon information observables.
        this.name = ko.observable();
        this.version = ko.observable();
        this.services = ko.observable();
        this.lastCommunication = ko.observable();
        this.ip = ko.observable();
        this.protocol = ko.observable();
        this.portRange = ko.observable();
        this.endpoint = ko.observable();
        this.rtt = ko.observable();
        this.daemonInfo = [
            {
                label: 'Node Name',
                value: this.name
            },
            {
                label: 'Installed Version',
                value: this.version
            },
            {
                label: 'Services',
                value: this.services
            },
            {
                label: 'Last Communication',
                value: this.lastCommunication
            },
            {
                label: 'Communication IP',
                value: this.ip
            },
            {
                label: 'Peer to Peer Connectivity',
                value: this.protocol,
                template: 'protocol'
            },
            {
                label: 'Port Range',
                value: this.portRange,
                template: 'portRange'
            },
            {
                label: 'Server Endpoint',
                value: this.endpoint
            },
            {
                label: 'Round Trip Time',
                value: this.rtt
            }
        ];

        // System information observables.
        this.hostname = ko.observable();
        this.upTime = ko.observable();
        this.os = ko.observable();
        this.cpus = ko.observable();
        this.memory = ko.observable();
        this.systemInfo = [
            {
                label: 'Host Name',
                value: this.hostname
            },
            {
                label: 'Up Time',
                value: this.upTime
            },
            {
                label: 'OS Type',
                value: this.os
            },
            {
                label: 'CPUs',
                value: this.cpus,
                template: 'cpus'
            },
            {
                label: 'Memory',
                value: this.memory,
                template: 'memory'
            }
        ];

        this.observe(state$.get('hosts', 'items', ko.unwrap(name)), this.onHost);
    }

    onHost(host) {
        if (!host) {
            this.isRetrustButtonVisible(false);
            this.isDeleteButtonWorking(false);
            return;
        }

        const {
            name,
            version,
            lastCommunication,
            ip,
            endpoint,
            rtt,
            hostname,
            upTime, os,
            cpus,
            services
        } = host;

        const cpusInfo = {
            count: cpus.units.length,
            utilization: `${numeral(cpus.usage).format('%')} utilization`
        };

        const hostIsBeingDeleted = host.mode === 'DELETING';

        if(!host.trusted) {
            this.untrustedReasons = flatMap(
                services.storage.nodes,
                node => node.untrusted.map(events => ({ events, drive: node.mount}))
            );
        }

        this.host = name;
        this.hostLoaded(true);
        this.isDeleteButtonWorking(hostIsBeingDeleted);
        this.isRetrustButtonVisible(!host.trusted);
        this.name(getHostDisplayName(name));
        this.version(version);
        this.services(_getServicesString(host));
        this.lastCommunication(moment(lastCommunication).fromNow());
        this.ip(ip);
        this.protocol(_getProtocol(host));
        this.portRange(_getPortRage(host));
        this.endpoint(endpoint);
        this.rtt(`${rtt.toFixed(2)}ms`);
        this.hostname(hostname);
        this.upTime(moment(upTime).fromNow(true));
        this.os(os);
        this.cpus(cpusInfo);
        this.memory(_getMemoryInfo(host));
    }

    onRetrust() {
        action$.onNext(openSetNodeAsTrustedModal(this.host, this.untrustedReasons));
    }

    onDeleteNode() {
        action$.onNext(openConfirmDeleteHostModal(this.host));
    }
}

export default {
    viewModel: HostDetailsFormViewModel,
    template: template
};
