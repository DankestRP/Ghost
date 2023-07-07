import AccountPage from './portal/AccountPage';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import LookAndFeel from './portal/LookAndFeel';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalPreview from './portal/PortalPreview';
import React, {useContext, useState} from 'react';
import SignupOptions from './portal/SignupOptions';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import useForm, {Dirtyable} from '../../../hooks/useForm';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {Setting, SettingValue, Tier} from '../../../types/api';
import {SettingsContext} from '../../providers/SettingsProvider';
import {fullEmailAddress} from '../../../utils/helpers';
import {useTiers} from '../../providers/ServiceProvider';

const Sidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    localTiers: Tier[]
    updateTier: (tier: Tier) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({localSettings, updateSetting, localTiers, updateTier, errors, setError}) => {
    const [selectedTab, setSelectedTab] = useState('signupOptions');

    const tabs: Tab[] = [
        {
            id: 'signupOptions',
            title: 'Signup options',
            contents: <SignupOptions
                errors={errors}
                localSettings={localSettings}
                localTiers={localTiers}
                setError={setError}
                updateSetting={updateSetting}
                updateTier={updateTier}
            />
        },
        {
            id: 'lookAndFeel',
            title: 'Look & feel',
            contents: <LookAndFeel localSettings={localSettings} updateSetting={updateSetting} />
        },
        {
            id: 'accountPage',
            title: 'Account page',
            contents: <AccountPage localSettings={localSettings} updateSetting={updateSetting} />
        }
    ];

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
    };

    return (
        <div className='pt-4'>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
        </div>
    );
};

const PortalModal: React.FC = () => {
    const modal = useModal();

    const [selectedPreviewTab, setSelectedPreviewTab] = useState('signup');
    const {settings, saveSettings, siteData} = useContext(SettingsContext);
    const {data: tiers, update: updateTiers} = useTiers();

    const {formState, saveState, handleSave, updateForm} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            tiers: tiers as Dirtyable<Tier>[]
        },

        onSave: async () => {
            await updateTiers(formState.tiers.filter(tier => tier.dirty));
            const {meta, settings: currentSettings} = await saveSettings(formState.settings.filter(setting => setting.dirty));

            if (meta?.sent_email_verification) {
                const newEmail = formState.settings.find(setting => setting.key === 'members_support_address')?.value;
                const currentEmail = currentSettings.find(setting => setting.key === 'members_support_address')?.value;

                NiceModal.show(ConfirmationModal, {
                    title: 'Confirm email address',
                    prompt: <>
                        We've sent a confirmation email to <strong>{newEmail}</strong>.
                        Until verified, your support address will remain {fullEmailAddress(currentEmail?.toString() || 'noreply', siteData!)}.
                    </>,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            }
        }
    });

    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const updateSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({
            ...state,
            settings: state.settings.map(setting => (
                setting.key === key ? {...setting, value, dirty: true} : setting
            ))
        }));
    };

    const setError = (key: string, error: string | undefined) => {
        setErrors(state => ({
            ...state,
            [key]: error
        }));
    };

    const updateTier = (newTier: Tier) => {
        updateForm(state => ({
            ...state,
            tiers: state.tiers.map(tier => (
                tier.id === newTier.id ? {...newTier, dirty: true} : tier
            ))
        }));
    };

    const onSelectURL = (id: string) => {
        setSelectedPreviewTab(id);
    };

    const sidebar = <Sidebar
        errors={errors}
        localSettings={formState.settings}
        localTiers={formState.tiers}
        setError={setError}
        updateSetting={updateSetting}
        updateTier={updateTier}
    />;
    const preview = <PortalPreview
        localSettings={formState.settings} localTiers={formState.tiers}
        selectedTab={selectedPreviewTab}
    />;

    let previewTabs: Tab[] = [
        {id: 'signup', title: 'Signup'},
        {id: 'account', title: 'Account page'},
        {id: 'links', title: 'Links'}
    ];

    return <PreviewModalContent
        deviceSelector={selectedPreviewTab !== 'links'}
        dirty={saveState === 'unsaved'}
        okLabel='Save & close'
        preview={preview}
        previewBgColor={selectedPreviewTab === 'links' ? 'white' : 'grey'}
        previewToolbarTabs={previewTabs}
        selectedURL={selectedPreviewTab}
        sidebar={sidebar}
        testId='portal-modal'
        title='Portal'
        onOk={async () => {
            if (!Object.values(errors).filter(Boolean).length) {
                await handleSave();
                modal.remove();
            }
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(PortalModal);